const firebaseConfig = {
  apiKey: 'AIzaSyAenkEiYmyW79gMypsSxCjm0YVEAYrMLuI',
  authDomain: 'explora-35854.firebaseapp.com',
  projectId: 'explora-35854',
  storageBucket: 'explora-35854.firebasestorage.app',
  messagingSenderId: '346266194316',
  appId: '1:346266194316:web:1fb5d7210af39374a1c6a9',
  measurementId: 'G-QQBVMB2TEW'
};

const firebaseApp = firebase.apps.length
  ? firebase.app()
  : firebase.initializeApp(firebaseConfig);
const firebaseAuth = firebase.auth();
const firebaseProvisioningApp = firebase.apps.some(app => app.name === 'taxi-operator-provisioning')
  ? firebase.app('taxi-operator-provisioning')
  : firebase.initializeApp(firebaseConfig, 'taxi-operator-provisioning');
const firebaseProvisioningAuth = firebaseProvisioningApp.auth();
const firebaseReady = new Promise((resolve, reject) => {
  let unsubscribe = () => {};
  unsubscribe = firebaseAuth.onAuthStateChanged(user => {
    unsubscribe();
    if (user) {
      resolve(user);
      return;
    }
    firebaseAuth.signInAnonymously().then(credential => resolve(credential.user), reject);
  }, reject);
});

window.taxiFirebase = {
  auth: firebaseAuth,
  db: firebase.firestore(),
  adminUid: 'xW9j182ayrcB0xyIrCOn84SRtBN2',
  ready: firebaseReady,
  async ensureSession() {
    await firebaseReady;
    if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
    const credential = await firebaseAuth.signInAnonymously();
    return credential.user;
  },
  async createOperatorAccount(email, password) {
    await firebaseProvisioningAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
    const credential = await firebaseProvisioningAuth.createUserWithEmailAndPassword(email, password);
    await firebaseProvisioningAuth.signOut();
    return credential.user.uid;
  }
};