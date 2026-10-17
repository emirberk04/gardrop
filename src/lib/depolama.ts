/** Tarayıcının veriyi kendiliğinden silmesini engelle (bölüm 3.5). */
export async function kaliciDepolamaIste() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // desteklenmiyorsa sessizce geç
  }
}
