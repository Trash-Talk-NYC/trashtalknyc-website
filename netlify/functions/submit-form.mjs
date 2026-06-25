const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

const SUBJECTS = {
  signup: 'New Trash Talk NYC Volunteer Signup',
  partnership: 'New Collaboration Inquiry — Trash Talk NYC',
  contact: 'New Contact Message — Trash Talk NYC',
};

export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid_json' }) };
  }

  const { formType, ...fields } = body;

  if (!formType || !['signup', 'contact', 'partnership'].includes(formType)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'invalid_form_type', detail: 'formType must be signup, contact, or partnership' }),
    };
  }

  const { FORM_KEY_SIGNUP, FORM_KEY_CONTACT } = process.env;
  const accessKey = formType === 'signup' ? FORM_KEY_SIGNUP : FORM_KEY_CONTACT;

  if (!accessKey) {
    const missing = formType === 'signup' ? 'FORM_KEY_SIGNUP' : 'FORM_KEY_CONTACT';
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'env_missing', detail: `Missing required env var: ${missing}` }),
    };
  }

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: SUBJECTS[formType],
        from_name: 'Trash Talk NYC Website',
        redirect: 'false',
        ...fields,
      }),
    });

    const data = await res.json();
    return { statusCode: res.status, headers: CORS, body: JSON.stringify(data) };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'fetch_failed', detail: err.message }),
    };
  }
};
