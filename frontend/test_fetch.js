const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('http://127.0.0.1:8080/api/v1/admin/me/bootstrap?slug=sports-demo', {
      headers: {
        'Authorization': 'Bearer acc_some_token', // We don't have the real token, but we should get 401
      }
    });
    console.log("SUCCESS:", res.status);
  } catch(e) {
    console.log("ERROR:", e.response?.status, e.response?.data);
  }
})();
