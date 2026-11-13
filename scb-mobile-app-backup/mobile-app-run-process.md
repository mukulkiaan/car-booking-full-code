Mobile App Kaise Run Karein (Step-By-Step)?
Aap apne mobile app ko live test karne ke liye in simple steps ko follow karein:

1. Terminal Open Kijiye aur mobile app directory me jayein:
   cd scb-mobile-app-backup

2. Metro Bundler Start Karein:
   - Method A (Recommended for Phone QR Scan):
     npm run tunnel
     (ya "run-app.bat" chala dein)
     Yeh tunnel mode use karta hai jisse aapka mobile phone kisi bhi Wi-Fi ya 4G/5G mobile data par ho, QR scan karne par bundle 100% load ho jayega aur "Something went wrong" nahi aayega.

   - Method B (Local LAN Mode):
     npm start

3. Phone Me Run Karein:
   - Expo Go app kholein aur terminal me aaye QR code ko scan karein.
   - Emulator chalana ho to terminal me "a" (Android) ya "i" (iOS) dabayein.

4. Standalone APK File Download Kaise Karein (Install & Share Karne Ke Liye):
   - "build-apk.bat" par double-click karein.
   - Expo login maangne par apna account login karein (Free signup: https://expo.dev/signup).
   - EAS Cloud par build poori hone ke baad screen par direct .APK Download link aur QR code show hoga.
   - Us link se APK download karke mobile me install karein ya WhatsApp/Drive par kisi ko bhi share karein.