Ama hani az önce bana iki farklı sitenin raporunu attın ya (overreacted.io ve mockups-design.com), ikisinde de yazan yazılar, cezalar, sürüm numaraları kelimesi kelimesine aynıydı.

İşte bunun sebebi şu kanka: Senin yaptığın o güzel dashboard (arayüz) şu an internete bağlanıp siteleri gerçekten incelemiyor. Arka planda hep aynı sahte (mock) veriyi döndürüyor. Bu yüzden hangi siteyi yazarsan yaz, karşına hep aynı "F aldın, şu kadar ceza yiyebilirsin" yazısı çıkıyor.

Bunu Gerçek Bir Canavara Nasıl Dönüştürürüz?
Sitenin gerçekten çalışması ve her yazılan URL'e göre farklı, doğru sonuçlar vermesi için arkasına küçük bir motor (backend servisi) bağlamamız lazım.

Mantık aynen şöyle işleyecek:

Sen kutucuğa google.com yazıp butona basacaksın.

Senin siten arka planda Google'ın kapısını çalacak ve "Hey Google, senin güvenlik kilitlerin (CSP, HSTS başlıkların) açık mı?" diye bakacak.

Google'da bu kilitler takılı olduğu için senin siten bu sefer "Tebrikler, A Aldınız (100/100)" diyecek ve o az önceki korkutucu hata yazılarının hiçbirini göstermeyecek.

Güvenliği kötü bir site yazınca da gerçekten o sitenin eksiklerini bulup ona göre puan kıracak.


kanka sıtedekı analız sonucları hep mock sahte verılerı uretıyr gercek verılerı sunmuyor gercek sonuclar vermıyor 

1. Sorun Ne? (Neden Herkese Aynı Sonucu Veriyor?)
Senin frontend arayüzün (localhost:5173) şu an çok şık bir kabuk. Ama taratmak için bir sitenin adını yazıp butona bastığında, sistemin internete çıkıp o siteyi gerçekten incelemiyor.

Kodunun arkasında sabit (sahte/mock) bir veri duruyor. Bu yüzden sen oraya google.com da yazsan, mockups-design.com da yazsan, sistem hep o arkadaki sabit dosyayı okuyor ve ekrana hep "F Notu (18/100)" ile başlayan aynı cezaları ve aynı hata metinlerini basıyor.


