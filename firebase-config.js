// Firebase 설정
// TODO: Firebase Console에서 프로젝트를 생성하고 아래 설정값을 입력하세요
// https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyCd6gvQHy-_uGX-0BGzQPcytt9oxoJspQ8",
  authDomain: "dcides-comment.firebaseapp.com",
  projectId: "dcides-comment",
  storageBucket: "dcides-comment.firebasestorage.app",
  messagingSenderId: "109211275500",
  appId: "1:109211275500:web:2af13c1bb86e15273855c9",
  measurementId: "G-K9FMHY18J6"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 인스턴스
const db = firebase.firestore();
