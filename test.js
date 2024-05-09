// transactions.test.js
import request from 'supertest';
import { app, handleData } from './app'; // express 앱과 handleData 함수를 import합니다.


jest.mock('./app', () => {
  const originalModule = jest.requireActual('./app');
  return {
    ...originalModule,
    handleData: jest.fn(),
  };
});

describe('/transactions route', () => {
  it('should require address and blocknumber', async () => {
    const response = await request(app).get('/transactions').query({});
    expect(response.status).toBe(400);
    expect(response.text).toBe('blocknumber and address 를 입력해주세요');
  });

  it('should validate address and blocknumber format', async () => {
    const response = await request(app)
      .get('/transactions')
      .query({ address: 'invalid_address', blocknumber: 'invalid_blocknumber' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "address 또는 blocknumber의 문자열 형식이 올바르지 않습니다."
    });
  });

  it('should handle valid address and blocknumber', async () => {
    handleData.mockResolvedValue(['0', '0', '1a3b', '10f']);
    const response = await request(app)
      .get('/transactions')
      .query({ address: '0x1234abcd', blocknumber: '1234' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      balanceChange: '0x1a3b',
      fee: '0x10f',
    });
  });

  it('should handle server errors', async () => {
    handleData.mockRejectedValue(new Error('Internal Server Error'));
    const response = await request(app)
      .get('/transactions')
      .query({ address: '0x1234abcd', blocknumber: '1234' });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});
