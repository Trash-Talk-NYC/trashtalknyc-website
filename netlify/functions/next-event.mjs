const EB_API = 'https://www.eventbriteapi.com/v3';

function mapEvent(e) {
  return {
    id: e.id,
    name: e.name?.text || '',
    url: e.url,
    status: e.status,
    start: e.start,
    end: e.end,
    venue: e.venue
      ? {
          name: e.venue.name,
          address: e.venue.address?.localized_address_display || null,
          city: e.venue.address?.city || null,
        }
      : null,
  };
}

export const handler = async function (event) {
  const { EVENTBRITE_TOKEN, EVENTBRITE_ORGANIZER_ID } = process.env;

  const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (!EVENTBRITE_TOKEN || !EVENTBRITE_ORGANIZER_ID) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'env_missing',
        detail: `Missing: ${!EVENTBRITE_TOKEN ? 'EVENTBRITE_TOKEN ' : ''}${!EVENTBRITE_ORGANIZER_ID ? 'EVENTBRITE_ORGANIZER_ID' : ''}`.trim(),
      }),
    };
  }

  const headers = {
    Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const all = event.queryStringParameters?.all === 'true';

  try {
    const res = await fetch(
      `${EB_API}/organizations/${EVENTBRITE_ORGANIZER_ID}/events/?time_filter=all&order_by=start_asc&expand=venue&page_size=100`,
      { headers }
    );

    if (!res.ok) {
      const raw = await res.text();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
      return {
        statusCode: res.status,
        headers: cors,
        body: JSON.stringify({ error: 'eventbrite_api_error', status: res.status, detail: parsed }),
      };
    }

    const data = await res.json();
    const now  = new Date().toISOString();
    const events   = (data.events || []).filter(e => e.status !== 'draft');
    const upcoming = events.filter(e => e.end.utc > now);
    const past     = events.filter(e => e.end.utc <= now);

    if (all) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ upcoming: upcoming.map(mapEvent), past: past.map(mapEvent) }),
      };
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify(upcoming[0] ? mapEvent(upcoming[0]) : null),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'fetch_failed', detail: err.message }),
    };
  }
};
