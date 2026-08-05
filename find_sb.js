const url = 'https://admin.ruhvi.in';
fetch(url + '/login')
  .then((r) => r.text())
  .then(async (t) => {
    const scripts = [...t.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]);
    for (const s of scripts) {
      const chunk = await fetch(url + (s.startsWith('/') ? '' : '/') + s).then(
        (r) => r.text()
      );
      const m = chunk.match(/https:\/\/[a-z0-9]+\.supabase\.co/);
      if (m) {
        console.log('Found in', s, m[0]);
        return;
      }
    }
    console.log('Not found in chunks either');
  });
