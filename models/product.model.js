import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    updateDoc
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

const COLLECTION_NAME = 'products';

class ProductModel {
    static _map_document(document_snapshot) {
        return {
            id: document_snapshot.id,
            ...document_snapshot.data()
        };
    }

    static async find_all() {
        const products_reference = collection(db, COLLECTION_NAME);
        const products_snapshot = await getDocs(products_reference);

        return products_snapshot.docs.map((document_snapshot) => {
            return ProductModel._map_document(document_snapshot);
        });
    }

    static async find_by_id(product_id) {
        const product_reference = doc(db, COLLECTION_NAME, product_id);
        const product_snapshot = await getDoc(product_reference);

        if (!product_snapshot.exists()) {
            return null;
        }

        return ProductModel._map_document(product_snapshot);
    }

    static async create(product_data) {
        const products_reference = collection(db, COLLECTION_NAME);
        const product_reference = await addDoc(products_reference, product_data);

        return ProductModel.find_by_id(product_reference.id);
    }

    static async update(product_id, product_data) {
        const product_reference = doc(db, COLLECTION_NAME, product_id);
        const product_snapshot = await getDoc(product_reference);

        if (!product_snapshot.exists()) {
            return null;
        }

        await updateDoc(product_reference, product_data);

        return ProductModel.find_by_id(product_id);
    }

    static async delete(product_id) {
        const product_reference = doc(db, COLLECTION_NAME, product_id);
        const product_snapshot = await getDoc(product_reference);

        if (!product_snapshot.exists()) {
            return false;
        }

        await deleteDoc(product_reference);

        return true;
    }
}

export { ProductModel };
