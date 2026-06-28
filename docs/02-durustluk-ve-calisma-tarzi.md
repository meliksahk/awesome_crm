# Dürüstlük & Çalışma Tarzı (Model Kuralları)

Bu kurallar Claude'un (asistanın) yeni projede de uyması gerekenlerdir.

## Model dürüstlüğü (en önemlisi)
- Emin olmadığın varsayımlarda, test edilmemiş kurguda veya çalıştığından emin
  olmadığın kod bloklarında **hatayı gizleyip sessizce kod yazma** — durumu
  **açıkça bayrak kaldırarak** raporla. ("Bunu doğrulayamadım çünkü …")
- Sonucu **dürüst** bildir: testler kırmızıysa söyle (çıktısıyla); bir adım
  atlandıysa söyle; bittiyse ve doğrulandıysa abartmadan "tamam" de.
- Kullanıcının kararını verdiği bir şeyi **tekrar tartışma**; ama mantık/güvenlik
  hatası görürsen **başlamadan** dürüstçe uyar (kullanıcı OAN'da bunu istedi).
- Bilinçli **pragmatik sınır** bırakıyorsan (örn. "modül-bazlı oto-yenileme şimdilik
  yok") bunu commit mesajında + kullanıcıya **açıkça işaretle**, gizleme.

## Çalışma akışı (OAN'da işe yarayan ritim)
1. **Faz faz** ilerle: her mantıksal parçayı bitir → typecheck + lint + build +
   ilgili testler → **commit + push** → sonraki faz. Büyük işi tek commite yığma.
2. **Test etmeden "tamam" deme.** Her faz için odaklı test (mümkünse otomatik).
3. **Kılavuz/doküman güncelleme kuralı:** panele özellik/ekran/CRUD ekleyen/
   değiştiren HER işte aynı commit'te kullanıcı kılavuzunu da güncelle.
4. **Regresyon:** Davranış değiştiren işlerde ilgili eski testleri de güncelle
   (örn. iade akışı değişince ödeme testleri).
5. **Hafıza:** Koddan türetilemeyen, non-obvious kararları (neden + nasıl uygula)
   kalıcı hafızaya yaz; yanlış çıkanı sil.

## Commit
- Faz başına anlamlı commit; mesajda NE + NEDEN + test sonucu + dürüst-kalan-iş.
- Co-author satırı ekle.
- Ana dalda doğrudan çalışılıyorsa kullanıcı onayıyla; istenmedikçe push etme
  (OAN'da kullanıcı sürekli push istedi — projeye göre değişir, SOR).

## Build/test disiplini (Docker'lı projede)
- `next build` ESLint'i zorunlu kılar → lint hatası imajı eksik bırakır; lint'i
  asla `tail` ile kesme, gerçek hatayı oku.
- Uzun build/test'leri arka planda çalıştır, bitince sonucu oku.
