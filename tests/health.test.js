const request = require('supertest');
const app = require('../index'); // Tu archivo principal de express (si exporta app)

describe('GET /health (O prueba de ruta base)', () => {
  it('Debería responder con estado 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
  });
});