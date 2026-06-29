# Code Style Guide

This guide documents the style, architecture, and structural conventions observed in the Precog Tracker codebase. It is intentionally descriptive of the existing repository, with a few explicit "new code" preferences where legacy code contains patterns we should not continue.

## 1. Naming Conventions

### Rule: Python modules, packages, directories, functions, variables, and model fields use `snake_case`.

Use lower-case words separated by underscores for importable files, helper functions, API payload locals, Django model fields, and database-facing fields.

```python
# backend/core/services/market_service.py
def validate_upcoming_market(self, market_data):
    start_timestamp = market_data.get('start_timestamp', '')
    collateral_address = market_data.get('collateral_address', '')
    creator_address = market_data.get('creator_address', '')
```

```python
# backend/core/models.py
collateral_total_volume = models.FloatField(default=0, null=True, blank=True)
master_market_id = models.PositiveIntegerField(null=True, blank=True, verbose_name='mid')
```

### Rule: Classes use `PascalCase`.

Django models, serializers, filters, permissions, service classes, admin classes, management commands, and test classes all use `PascalCase`.

```python
class Market(AuditableModel):
    ...


class MarketDataSerializer(serializers.ModelSerializer):
    ...


class MarketFilter(filters.FilterSet):
    ...


class MarketService:
    ...
```

### Rule: Django model choice enums use nested `PascalCase` classes with uppercase values.

Place the `TextChoices` class inside the model it belongs to. Enum member names and stored values are uppercase strings.

```python
class UpcomingMarket(AuditableModel):
    class Status(models.TextChoices):
        CREATED = 'CREATED', 'CREATED'
        VALIDATED = 'VALIDATED', 'VALIDATED'
        REJECTED = 'REJECTED', 'REJECTED'
        FUNDED = 'FUNDED', 'FUNDED'
        DEPLOYED = 'DEPLOYED', 'DEPLOYED'
```

### Rule: Constants and configuration-like class attributes use uppercase when they are true constants.

Use uppercase for loop limits, thresholds, and immutable class-level settings.

```python
class MarketsMonitor:
    THROTTLE_INTERVAL = 60_000  # Milliseconds (main loop time) [60_000 in PROD]
    OCCASIONAL_TASKS_PERIOD = 5
    MAX_EXCEPTIONS = 3
    MAX_MISSED_CYCLES = 4
```

### Rule: Service class names end in `Service`; long-running monitor classes end in `Monitor`.

Service classes own domain or infrastructure workflows and are named after the capability they provide.

```python
class TokenClaimService:
    ...


class MarketService:
    ...


class MarketsMonitor:
    ...
```

### Rule: DRF serializers are named as model plus role, usually `DataSerializer`.

Use `<ModelName>DataSerializer` for public API projections and `<ModelName>Serializer` for broader model serializers.

```python
class MarketTradeDataSerializer(serializers.ModelSerializer):
    market_name = serializers.CharField(source='market.name', read_only=True)

    class Meta:
        model = MarketTrade
        exclude = general_private_fields
```

### Rule: DRF filters are named `<ModelName>Filter`.

Keep filter class names aligned one-to-one with the model/queryset they filter.

```python
class ReferralActionFilter(filters.FilterSet):
    code = filters.CharFilter(field_name='code', lookup_expr='iexact')
    action = filters.CharFilter(field_name='action', lookup_expr='iexact')
```

### Rule: API view classes end in `ViewSet`, `APIView`, or `View` according to DRF role.

Use `ViewSet` for router-backed CRUD/list resources, `APIView` for explicit action endpoints, and `View` for rare custom API controllers.

```python
class MarketViewSet(viewsets.ModelViewSet):
    ...


class CreateUpcomingMarketAPIView(APIView):
    ...


class ReferralActivityView(APIView):
    ...
```

### Rule: Permission classes begin with `Is` and read as predicates.

Permission names should state the authorization condition.

```python
class IsValidAPIUser(permissions.BasePermission):
    message = 'ERROR P400'


class IsValidOpenAPIUser(permissions.BasePermission):
    message = 'ERROR P400'
```

### Rule: Admin-only display helper methods use a leading underscore.

Use `_name` for computed admin columns and other local helpers that are not part of the domain API.

```python
@admin.register(MarketTrade)
class MarketTradeAdmin(AuditableAdmin):
    def _account(self, obj):
        return f'{obj.account_address[0:8]}...{obj.account_address[-6:]}'

    def _collateral(self, obj):
        return f'{round(amount, 1)} {token}'
```

### Rule: Private implementation helpers use a leading underscore.

Use `_method_name` for internal implementation details inside services and utility classes.

```python
class TokenClaimService:
    def _from_base64url(self, value):
        padded = value + '=' * (-len(value) % 4)
        return base64.urlsafe_b64decode(padded)
```

### Rule: Tests are named `test_*.py`, test classes are `Test*`, and test methods are `test_*`.

Group related assertions in a `Test<ClassOrModule>` class when the module has multiple related behaviors.

```python
class TestHelpers:
    def test_camel_case(self):
        assert camel_case('this_that') == 'thisThat'

    def test_retry_default(self):
        ...
```

### Rule: URL paths use kebab-case.

Router resources are nouns. Action endpoints are verb phrases under `actions/`.

```python
router.register(r'market-prices', views.MarketPriceViewSet, basename='market-prices')
router.register(r'upcoming-markets', views.UpcomingMarketViewSet, basename='upcoming-markets')

urlpatterns = [
    path('actions/create-market/', views.CreateMarketAPIView.as_view()),
    path('actions/unlock-market-funding/', views.UnlockMarketFundingView.as_view()),
]
```

### Rule: Management command filenames use `snake_case` verbs.

Command names should describe the action invoked from `manage.py`.

```python
# backend/core/management/commands/start_markets_monitor.py
class Command(BaseCommand):
    help = 'Start markets monitor by chain id'
```

## 2. Code Structure & Layout

### Rule: Imports appear first and are grouped by standard library, third-party, Django, then local modules.

Separate import groups with one blank line. Prefer explicit local imports for new code.

```python
import os
from os import environ
from datetime import datetime, timezone

import requests
from requests.auth import HTTPBasicAuth

from django.conf import settings
from django.utils import timezone

from common.log import CustomLogger
from common.web3_service import Web3Service
from core.models import UpcomingMarket, Market
```

### Rule: Multi-item imports are parenthesized when they would become long.

Keep long imports readable by wrapping in parentheses.

```python
from core.models import (Market, PrecogAccount, MarketPrice, MarketTrade, UpcomingMarket,
                         UpcomingMarketFunder, PlayerScore, ReferralAction)
```

### Rule: Module-level helper constants live immediately after imports.

Place shared serializer/filter constants before class definitions.

```python
from core.models import Market

# Helper variable to be used in all serializers
general_private_fields = ('is_active',)


class MarketDataSerializer(serializers.ModelSerializer):
    ...
```

### Rule: Class-level constants and static configuration appear before `__init__`.

Put class identity, fixed addresses, shares, limits, and internal service placeholders at the top of the class.

```python
class MarketService:
    name = 'ms-x'
    precog_creator = '0x5D45B7d8e517eF6b7085175ed395D9c8562b952f'
    funders_rewards_share = 0.9
    creator_rewards_share = 0.1

    log = None
    web3_service = None
    acc_manager = None

    def __init__(self):
        ...
```

### Rule: Model layout is `choices`, grouped fields, instance methods, then `Meta`.

Group model fields with short section comments when the model is large. Put `__str__` and other instance methods before `Meta`.

```python
class ReferralAction(AuditableModel):
    class Action(models.TextChoices):
        VIEW = 'VIEW', 'VIEW'
        LOGIN = 'LOGIN', 'LOGIN'

    # Basic info
    code = models.CharField(max_length=255, null=True)
    action = models.CharField(max_length=255, choices=Action.choices, null=True)

    # Optional references
    address = models.CharField(max_length=255, null=True, blank=True)
    tx_hash = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        verbose_name = 'Referral Action'
        verbose_name_plural = 'Referral Actions'
```

### Rule: Serializer layout is custom fields, then nested `Meta`, then validators.

Keep derived serializer fields at the top. Keep `Meta` close to the field declarations. Put `validate_*` methods after `Meta`.

```python
class PrecogAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrecogAccount
        exclude = general_private_fields

    def validate_email(self, value):
        sanitized = value.lower().strip()
        if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', sanitized):
            raise serializers.ValidationError("Invalid email format")
        return sanitized
```

### Rule: Filter layout is declared filters first, then `Meta`, then custom filter methods.

Keep method-based filters next to the filter class that owns them.

```python
class UpcomingMarketFilter(filters.FilterSet):
    status = filters.MultipleChoiceFilter(field_name='status', choices=UpcomingMarket.Status.choices, conjoined=False)
    network = filters.NumberFilter(field_name='chain_id', lookup_expr='exact')
    funder_address = filters.CharFilter(method='filter_by_funder_address')

    class Meta:
        model = UpcomingMarket
        fields = {
            'id': ['exact', ],
            'chain_id': ['exact', ],
        }

    def filter_by_funder_address(self, queryset, name, value):
        ...
```

### Rule: ViewSet layout is DRF configuration first, then queryset/list/update overrides.

Put `authentication_classes`, `permission_classes`, `http_method_names`, `serializer_class`, `filter_backends`, and `filterset_class` before methods.

```python
class MarketViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [IsValidAPIUser, ]
    http_method_names = ['get', ]
    serializer_class = MarketDataSerializer
    filter_backends = (filters.DjangoFilterBackend, OrderingFilter)
    filterset_class = MarketFilter

    def get_queryset(self):
        ...
```

### Rule: Action views follow the request lifecycle in order.

Order code as: extract parameters, validate required shape, initialize service, validate domain, perform action, stop service, build response.

```python
def post(self, request):
    network = request.data.get('network')
    market = request.data.get('market')

    if not (network and market):
        return Response({'error': 'Required parameters needed'}, status=status.HTTP_400_BAD_REQUEST)

    market_service = MarketService()

    is_valid_network = market_service.validate_network(network)
    if not is_valid_network:
        market_service.stop()
        return Response({'error': 'Invalid network received'}, status=status.HTTP_400_BAD_REQUEST)

    response_data = {'status': 'OK'}
    market_service.stop()
    return Response(response_data)
```

### Rule: Use 4-space indentation and standard Python block placement.

Colons stay on the declaration line. Method bodies are indented by 4 spaces. Blank lines separate top-level classes.

```python
class ApplicationToken(AuditableModel):
    token = models.CharField(max_length=255, null=True, blank=True)
    expire_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'App Token: #{self.id}'
```

### Rule: Use multi-line dictionaries and lists for API payloads and long config values.

When a response or settings value has several keys, put each key on its own line.

```python
response_data = {
    'upcoming_market': updated_market.id,
    'status': updated_market.status,
    'chain': updated_market.chain_id,
    'market': updated_market.deployed_market_id
}
```

### Rule: Prefer single quotes for Python strings unless double quotes avoid escaping or match external text.

The dominant style is single-quoted strings. Double quotes appear where the literal itself contains single quotes or external text is clearer as-is.

```python
status = models.CharField(max_length=127, choices=Status.choices, default=Status.CREATED)
return Response({'error': 'Invalid network received'}, status=status.HTTP_400_BAD_REQUEST)

error_msg = 'address query parameter is required'
return Response({"detail": error_msg}, status=status.HTTP_400_BAD_REQUEST)
```

### Rule: Use f-strings for interpolation.

Avoid string concatenation for human-readable messages that include variables.

```python
self.log.error(f'Error initializing web3 ({network})', error=str(e))
return f'Market: {self.master_market_id} [{self.chain_name}]'
```

### Rule: Use early returns for validation failures.

Do not nest the entire happy path under `else` after a failed validation.

```python
if not (network and token and receiver):
    return Response({'error': 'Required parameters needed'}, status=status.HTTP_400_BAD_REQUEST)

is_valid_token = token_claim_service.validate_token(network, token)
if not is_valid_token:
    token_claim_service.stop()
    return Response({'error': 'Invalid network/token received'}, status=status.HTTP_400_BAD_REQUEST)
```

### Rule: Use trailing commas in single-item tuples and short one-item lookup lists.

This is common in DRF settings, permissions, and filter lookup lists.

```python
permission_classes = [IsValidAPIUser, ]
http_method_names = ['get', ]

fields = {
    'id': ['exact', ],
    'chain_id': ['exact', ],
}
```

## 3. Comment & Documentation Style

### Rule: Use comments to identify logical sections in long models, views, services, and settings.

Section comments are short title fragments, not paragraphs.

```python
# Main parameters
name = models.CharField(max_length=500, null=True, blank=True)
description = models.TextField(null=True, blank=True)

# Reference fields
master_address = models.CharField(max_length=255, null=True, blank=True)
master_market_id = models.PositiveIntegerField(null=True, blank=True, verbose_name='mid')
```

### Rule: Explain intent, constraints, or operational reasoning rather than restating syntax.

Good comments answer why a check, lock, sleep, or special case exists.

```python
# Get lock to avoid any other process to execute next critical code
lock_acquired = market_service.get_lock('claim-investment')

# Wait for the process to start (and the new process is fully detached)
sleep(3)
```

### Rule: Mark future work with uppercase `TODO`.

Keep TODOs specific enough that the next engineer can act on them.

```python
# TODO Extract this check to a `ApplicationTokenService` function
active_tokens = ApplicationToken.objects.filter(is_active=True)

# TODO Add support to EIP1559 txs (type 2)
signed_tx = self.web3.eth.account.sign_transaction(transaction, self.default_account.key)
```

### Rule: Use docstrings for reusable infrastructure and helpers, not for every model or trivial method.

Docstrings are most common in utilities and shared services where usage, arguments, or behavior need explanation.

```python
def retry(attempts=1, pause=0):
    """
    Retry decorator.

    This decorator adds two keyword arguments to the wrapped function: `attempts` and `pause`.
    """
```

### Rule: Module docstrings are acceptable for standalone service libraries.

Use a module docstring when the module exposes a reusable service and benefits from examples.

```python
"""Email and Slack notifications library

Example:
    from common.notification_service import NotificationService
    notifier = NotificationService()
"""
```

### Rule: Inline comments are acceptable for field-level business meaning.

Use short inline comments for domain nuance, units, external constraints, or non-obvious values.

```python
collateral_total_volume = models.FloatField(default=0, null=True, blank=True)  # Total volume of all trades
claim_eth_subsidy = 0.000015  # 0.05 usd (sent only if destination wallet is empty and token kind = 'SPONSORED')
```

### Rule: Commented-out code is legacy-only and should not be introduced in new work.

If behavior is deprecated, keep a short note only when it preserves important history. New code should use git history instead.

```python
# Avoid adding new blocks like this:
# proof_known_signers = [
#     '044e711fd3a1792a825aa896104da5276bbe710fd9b59dddea1aaf8d84535aaf',
# ]
```

## 4. Paradigm & Function Usage

### Rule: The application favors pragmatic object-oriented Django architecture.

Use classes for models, serializers, filters, permissions, views, services, admin screens, monitors, and management commands.

```python
class Market(AuditableModel):
    ...


class MarketService:
    ...


class Command(BaseCommand):
    ...
```

### Rule: Use module-level functions for stateless helpers.

Pure transformations, decorators, and small utility functions belong in `common/helpers.py` style modules.

```python
def camel_case(snake):
    if snake.startswith('_'):
        snake = snake[1:]

    first, *others = snake.split('_')
    return ''.join([first.lower(), *map(str.title, others)])
```

### Rule: Services own external resources and expose explicit lifecycle methods.

Instantiate services where needed, initialize their resources in `__init__` or `initialize_*`, and call `stop()` when the request or command is done.

```python
market_service = MarketService()
market_service.initialize_web3_provider(upcoming_market.chain_id)
deployed_market_id = market_service.deploy_upcoming_market(upcoming_market_id)
market_service.stop()
```

### Rule: Keep API views as orchestration, not domain logic containers.

Request parsing and response shaping live in views. Blockchain, Privy, allocation, funding, and market domain behavior live in services.

```python
is_valid_market_data = market_service.validate_upcoming_market(market_data)
if not is_valid_market_data:
    market_service.stop()
    return Response({'error': 'Invalid parameters received'}, status=status.HTTP_400_BAD_REQUEST)

created_market = market_service.create_upcoming_market(market_data)
```

### Rule: Use instance methods for stateful behavior and static methods for isolated helpers.

Helpers that do not need instance state can be `@staticmethod`.

```python
class IsValidAPIUser(permissions.BasePermission):
    @staticmethod
    def _get_client_ip(request):
        ip = request.META.get('REMOTE_ADDR')
        return ip
```

### Rule: Prefer shallow control flow with validation guard clauses.

Nested conditionals are used for domain branching, but validation failures should return immediately.

```python
if not self.web3_service.is_address(collateral_address):
    self.log.error('Error validating collateral', collateral=collateral_address)
    return False

if not self.web3_service.is_address(creator_address):
    self.log.error('Error validating creator', creator=creator_address)
    return False
```

### Rule: Keep functions cohesive even if some domain workflows are long.

New functions should handle one stage of a workflow. Extract helpers when a method mixes request parsing, validation, persistence, external calls, and response formatting beyond readability.

```python
# Preferred extraction shape for new code:
def validate_network(self, network):
    try:
        chain_id = int(network)
        supported_chains = list(settings.PRECOG_MASTER_MAP.keys())
        return chain_id in supported_chains
    except Exception as e:
        self.log.error('Error validating network', network=network, error=str(e))
        return False
```

### Rule: Limit parameter lists by grouping request or domain payloads into dictionaries when many fields travel together.

This codebase commonly uses a `market_data` dictionary to carry market creation inputs through validation and creation.

```python
market_data = {
    'name': request.data.get('question'),
    'description': request.data.get('resolution_criteria'),
    'image_url': request.data.get('image_url'),
    'category': request.data.get('category'),
    'outcomes': request.data.get('outcomes'),
    'start_timestamp': request.data.get('start_timestamp'),
    'end_timestamp': request.data.get('end_timestamp'),
}

is_valid_market_data = market_service.validate_upcoming_market(market_data)
```

## 5. Structural & Architectural Patterns

### Rule: The repository is backend-first and organized around a Django project plus one primary app.

Keep project wiring in `backend/backend`, application code in `backend/core`, shared infrastructure in `backend/common`, and deployment support at the repo root.

```text
backend/
  backend/          # Django project settings, URLs, handlers, project services
  core/             # Main app: models, views, serializers, filters, services
  common/           # Shared logging, web3, notification, account, helper libraries
nginx/
postgres/
redis/
scripts/
```

### Rule: The `core` app follows Django/DRF layers.

Do not mix models, serializers, filters, views, and services into a single file unless the existing layer owns that responsibility.

```text
backend/core/models.py
backend/core/serializers.py
backend/core/filters.py
backend/core/views.py
backend/core/services/market_service.py
backend/core/management/commands/start_markets_monitor.py
```

### Rule: Business workflows belong in `core/services`.

Validation, Web3 interactions, Privy calls, market deployment, claims, funding, and monitor logic should live outside views.

```python
from core.services.market_service import MarketService

market_service = MarketService()
validated_market = market_service.register_market_funding(
    upcoming_market_id, float(amount), tx_hash, funder_address
)
```

### Rule: Cross-cutting infrastructure belongs in `common`.

Logging, Web3 wrappers, notifications, account vault access, signatures, gas pricing, and helpers live in `backend/common`.

```python
from common.log import CustomLogger
from common.web3_service import Web3Service
from common.account_manager import AccountManager
from common.notification_service import NotificationService
```

### Rule: API authorization is handled through DRF permission classes.

Views should attach permission classes instead of hand-rolling API key checks inside each endpoint.

```python
class FundUpcomingMarketAPIView(APIView):
    authentication_classes = []
    permission_classes = [IsValidOpenAPIUser, ]
    http_method_names = ['post']
```

### Rule: Router-backed resources expose read-oriented collections; custom commands use explicit paths.

Keep listable resource endpoints in the DRF router. Put operational commands under `actions/` or dedicated open API paths.

```python
router.register(r'markets', views.MarketViewSet, basename='markets')

urlpatterns = [
    path('actions/token-claim/', views.TokenClaimAPIView.as_view()),
    path('create-upcoming-market/', views.CreateUpcomingMarketAPIView.as_view()),
]
```

### Rule: Query behavior belongs in `FilterSet` classes and `get_queryset`.

Use `FilterSet` for user-facing filtering and `get_queryset` for default scoping such as `is_active=True` and default chain selection.

```python
def get_queryset(self):
    model = self.serializer_class.Meta.model
    queryset = model.objects.filter(is_active=True).order_by('id')

    if not self.request.query_params.get('chain_id'):
        queryset = queryset.filter(chain_id=settings.API_DEFAULT_CHAIN_ID)

    return queryset
```

### Rule: Management commands are thin entrypoints into services.

Commands parse CLI arguments, log the execution, fetch initial database state, then delegate long work to services or monitors.

```python
class Command(BaseCommand):
    def handle(self, *args, **options):
        chain_id = options['id']
        markets_monitor = MarketsMonitor(monitor_instance.id)
        markets_monitor.initialize()
        markets_monitor.start()
```

### Rule: Dependency injection is manual and configuration-driven.

There is no DI framework. Dependencies are instantiated explicitly and configured from Django `settings` and environment variables.

```python
self.log = CustomLogger(name=self.name, level=environ.get('LOG_LEVEL'), stdout=False, flush=True)
self.log.init_redis(settings.REDIS_URL)

self.web3_service = Web3Service()
self.acc_manager = AccountManager(settings.VAULT_FILENAME)
```

### Rule: Shared settings are centralized in `backend/settings.py`.

Use `settings` for environment, keys, allowed hosts, chain maps, provider maps, and app-level constants.

```python
API_DEFAULT_CHAIN_ID = 8453

PRECOG_MASTER_MAP = {
    8453: '0x00000000000c109080dfa976923384b97165a57a',
    84532: '0x61ec71F1Fd37ecc20d695E83F3D68e82bEfe8443',
    42161: '0x0000000000990400E12543B7f400136e8672E2F0'
}
```

## 6. Error Handling & Logging

### Rule: API validation failures return DRF `Response` objects with explicit HTTP status codes.

Use concise `{'error': '...'}` or `{'detail': '...'}` payloads and the appropriate DRF status constant.

```python
if not (network and market and investor_did):
    return Response({'error': 'Required parameters needed'}, status=status.HTTP_400_BAD_REQUEST)

if not management_code == settings.MANAGEMENT_CODE:
    return Response({'error': 'Invalid code'}, status=status.HTTP_401_UNAUTHORIZED)
```

### Rule: Services log validation failures and return `False` for expected invalid input.

Use `self.log.error(...)` with structured keyword context before returning `False`.

```python
if chain_id not in supported_chains:
    self.log.error('Error validating chain id', chain_id=chain_id, supported=supported_chains)
    return False
```

### Rule: Catch broad exceptions only at service or monitor boundaries, and include context in the log.

Broad catches are acceptable around external APIs, parsing, Web3 calls, monitor loops, and validation boundaries. Include `error=str(e)` or exception type details.

```python
try:
    chain_id = int(network)
except Exception as e:  # pylint: disable=broad-except
    self.log.error('Error validating network', network=network, error=str(e))
    return False
```

### Rule: Raise wrapped exceptions for infrastructure failures that cannot be handled locally.

When initialization or external service setup fails, log first and raise a more meaningful exception.

```python
try:
    contract = self._web3.get_precog_master_contract(precog_master_address)
    contract.functions.createdMarkets().call()
    return contract
except Exception as e:
    self.log.error('Error getting PrecogMasterV8 contract', exc=str(e))
    raise RuntimeError('Could not get PrecogMasterV8 contract') from e
```

### Rule: Use `CustomLogger` rather than `print` in application services and server paths.

Application code should emit structured logs with keyword fields.

```python
self.log.info('Market config requested', network=network, market_configs=len(market_config.keys()))
self.log.warn('Restarting service', exceptions=self.accumulated_exceptions, max=self.MAX_EXCEPTIONS)
self.log.critical('Unexpected critical error', exc=str(e), name=str(type(e).__name__))
```

### Rule: Reserve `print` and `input` for interactive management commands only.

Interactive deployment or maintenance commands may use console output and prompts.

```python
class Command(BaseCommand):
    help = 'Deploy upcoming market (interactive)'

    def handle(self, *args, **options):
        print('\n\n> Deploying upcoming market...\n')
        answer = input("> Do you want to continue with this market? (y/n): ").strip().lower()
```

### Rule: Critical sections use file locks or named locks and must release on the success path.

Acquire locks before one-at-a-time blockchain or claim operations, return 503 if unavailable, and release after the critical operation.

```python
lock_acquired = token_claim_service.get_lock('claim-token')
if not lock_acquired:
    token_claim_service.stop()
    return Response({'error': 'Server temporally unavailable'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

tx_hash, claim_status = token_claim_service.execute_claim(
    network, token, claim_identifier, receiver, allocation_amount
)

token_claim_service.release_lock('claim-token')
```

### Rule: Long-running monitors handle expected restart signals separately from unexpected failures.

Expected restart/control-flow exceptions should log as warnings. Unexpected exceptions log as critical, include traceback, notify, and retry up to a limit.

```python
try:
    self.run_main_loop()
except Restart as e:
    self.log.warn('Restart signal detected', exc=str(e))
    self.accumulated_exceptions += 1
except Exception as e:
    self.log.critical('Unexpected critical error', exc=str(e), name=str(type(e).__name__))
    error = str(traceback.format_exc())
    self.log.debug(error)
    self.notify_error(f'Unexpected critical error\n\n{error}')
```

## 7. Data Models

### Rule: Persisted state is modeled with Django ORM models.

Models inherit from `AuditableModel` when they need audit timestamps and active state patterns.

```python
class AuditableModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, null=True, editable=False)

    class Meta:
        abstract = True


class Market(AuditableModel):
    is_active = models.BooleanField(default=True)
```

### Rule: Soft deletion and public API hiding use `is_active`.

Default querysets filter to active rows, and serializers exclude `is_active` from public output.

```python
queryset = model.objects.filter(is_active=True).order_by('id')

general_private_fields = ('is_active',)

class MarketDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = Market
        exclude = general_private_fields
```

### Rule: Model validation is split between serializers and services.

Use serializer `validate_*` methods for field-level API data normalization. Use services for cross-field domain validation and external checks.

```python
def validate_email(self, value):
    sanitized = value.lower().strip()
    if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', sanitized):
        raise serializers.ValidationError("Invalid email format")
    return sanitized
```

```python
def validate_upcoming_market(self, market_data):
    start_date = datetime.fromtimestamp(int(start_timestamp), tz=timezone.utc)
    end_date = datetime.fromtimestamp(int(end_timestamp), tz=timezone.utc)
    if not start_date < end_date:
        self.log.error('Error validating market dates', start=start_timestamp, end=end_timestamp)
        return False
```

### Rule: API serialization defaults to excluding private fields.

Prefer `exclude = general_private_fields` for model serializers unless the public contract requires an explicit `fields` list.

```python
class PlayerScoreDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerScore
        exclude = general_private_fields
```

### Rule: Use nested serializers for related public data.

Expose related collections through read-only nested serializers when the relationship is part of the public response.

```python
class UpcomingMarketDataSerializer(serializers.ModelSerializer):
    funders = UpcomingMarketFunderDataSerializer(many=True, read_only=True)

    class Meta:
        model = UpcomingMarket
        exclude = general_private_fields + ('creator_email', 'creator_handle')
```

### Rule: State fields use explicit status strings rather than implicit booleans when there are multiple states.

Use `TextChoices` for finite state machines and compare against the enum values.

```python
valid_statuses = [UpcomingMarket.Status.VALIDATED, UpcomingMarket.Status.FUNDED]
if not (validated_market and validated_market.status in valid_statuses):
    return Response({'error': 'Invalid market or parameters'}, status=status.HTTP_400_BAD_REQUEST)
```

### Rule: Nullable optional database fields commonly use `null=True, blank=True`.

This is the dominant model style for optional fields exposed through Django admin and APIs.

```python
creator_email = models.CharField(max_length=255, null=True, blank=True)
creator_handle = models.CharField(max_length=255, null=True, blank=True)
notes = models.TextField(null=True, blank=True)
```

### Rule: Type hints are encouraged for shared infrastructure, but not required everywhere.

The common package uses selective type hints for public infrastructure surfaces and class attributes. New shared utilities should follow that direction.

```python
class LogManager:
    redis: redis.Redis | None
    processed: List[str]
    log: CustomLogger

    def process_batch(self, logs: List[Tuple[str, dict]] | Awaitable):
        ...
```

## 8. Anti-patterns to Avoid

### Rule: Avoid wildcard imports in new code.

Some legacy modules use wildcard imports, but new code should import explicit names to keep dependencies visible and static analysis useful.

```python
# Avoid:
from core.filters import *
from core.serializers import *

# Prefer:
from core.filters import MarketFilter, MarketPriceFilter
from core.serializers import MarketDataSerializer, MarketPriceDataSerializer
```

### Rule: Avoid `print` debugging in API views, services, permissions, and monitors.

Use `CustomLogger` with structured fields instead.

```python
# Avoid:
print("\n\nStatus values:", request.query_params.getlist("status"))

# Prefer:
self.log.info('Status values received', status=request.query_params.getlist('status'))
```

### Rule: Avoid hard-coded secrets, API keys, private URLs, and credentials in new code.

Settings currently contain legacy hard-coded values. New sensitive values must come from environment variables.

```python
# Avoid:
OPEN_API_KEY = '43f349ef-7e1e-40b0-b718-f0f913514b15'

# Prefer:
OPEN_API_KEY = os.getenv('OPEN_API_KEY', '')
```

### Rule: Avoid unstructured broad exceptions that silently swallow failures.

If catching `Exception`, log context or re-raise with a meaningful wrapper.

```python
# Avoid:
try:
    referral.save()
except Exception:
    return Response({'error': 'failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Prefer:
try:
    referral.save()
except Exception as e:
    log.error('Error registering referral action', code=referral_code, action=referral_action, error=str(e))
    return Response({'error': 'Registering action'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

### Rule: Avoid putting business logic directly in views when it belongs in a service.

Views should orchestrate request/response flow. Put reusable domain behavior behind service methods.

```python
# Avoid in a view:
if not name.endswith('?'):
    return Response({'error': 'Invalid parameters received'}, status=status.HTTP_400_BAD_REQUEST)

# Prefer in a view:
is_valid_market_data = market_service.validate_upcoming_market(market_data)
if not is_valid_market_data:
    market_service.stop()
    return Response({'error': 'Invalid parameters received'}, status=status.HTTP_400_BAD_REQUEST)
```

### Rule: Avoid leaking private fields in serializers.

Public serializers should exclude `is_active` and sensitive creator contact fields unless explicitly required.

```python
# Prefer:
class UpcomingMarketDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpcomingMarket
        exclude = general_private_fields + ('creator_email', 'creator_handle')
```

### Rule: Avoid live network dependencies in new unit tests unless the test is explicitly integration-scoped.

Prefer deterministic tests with mocks or local fixtures for service behavior.

```python
# Avoid for unit tests:
web3 = Web3Service().init('https://polygon-mainnet.g.alchemy.com/v2/...', timeout=30)
assert web3.get_network() == 'Polygon'

# Prefer:
def test_validate_network_rejects_unknown_chain(settings):
    settings.PRECOG_MASTER_MAP = {8453: '0x00000000000c109080dfa976923384b97165a57a'}
    assert MarketService().validate_network(999999) is False
```

### Rule: Avoid adding more commented-out implementation blocks.

Use TODO comments for planned work and git history for removed implementations.

```python
# Avoid:
# def old_implementation(self):
#     ...

# Prefer:
# TODO Replace legacy proof flow after clients migrate to the new endpoint
```

### Rule: Avoid ambiguous status strings outside model enums.

When a model owns a status enum, compare to `Model.Status.VALUE` instead of spelling raw strings throughout the code.

```python
# Avoid:
if upcoming_market.status == 'FUNDED':
    ...

# Prefer:
if upcoming_market.status == UpcomingMarket.Status.FUNDED:
    ...
```

### Rule: Avoid missing service cleanup on early returns.

If a service is initialized in a request or command path, stop it before returning from validation failures or success.

```python
market_service = MarketService()

if not market_service.validate_network(network):
    market_service.stop()
    return Response({'error': 'Invalid network received'}, status=status.HTTP_400_BAD_REQUEST)

market_service.stop()
return Response(response_data)
```

### Rule: Avoid growing monolithic files further when adding substantial new domains.

The existing `views.py`, `models.py`, and services are large. New unrelated domains should be placed in focused modules while preserving Django conventions.

```text
# Prefer for a new substantial workflow:
backend/core/services/referral_service.py
backend/core/services/application_token_service.py

# Keep imports explicit:
from core.services.referral_service import ReferralService
```

