const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8080/api/v1/admin/me/bootstrap?slug=sports-demo', {
      headers: {
        'Authorization': 'Bearer acc_fake'
      },
      timeout: 2000
    });
    console.log("SUCCESS:", res.status);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
})();
