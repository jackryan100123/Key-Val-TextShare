// test-firebase.js
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const testFirebase = async () => {
  try {
    const docRef = await addDoc(collection(db, 'test'), {
      message: 'Hello Firebase!',
      timestamp: new Date()
    });
    console.log('Document written with ID: ', docRef.id);
  } catch (e) {
    console.error('Error adding document: ', e);
  }
};

testFirebase();