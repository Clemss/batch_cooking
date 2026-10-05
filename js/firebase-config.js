// 1) Colle ici la config web de ton projet Firebase
//    (Console Firebase → ⚙️ Paramètres du projet → Tes applications → Config).
//    Ces valeurs ne sont pas secrètes : la sécurité est assurée par firestore.rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyBENCjIFPc0td6rPdIGrd8CD9Xdp_KkVAA',
  authDomain: 'batch-cooking-2474d.firebaseapp.com',
  projectId: 'batch-cooking-2474d',
  storageBucket: 'batch-cooking-2474d.firebasestorage.app',
  messagingSenderId: '192012371603',
  appId: '1:192012371603:web:1c61c013ebab91d264af66',
};

// 2) URL de ton Worker Cloudflare pour l'envoi vers Bring
//    (ex. 'https://menu-batch-bring.ton-pseudo.workers.dev'). Laisse vide pour désactiver.
export const WORKER_URL = '';
