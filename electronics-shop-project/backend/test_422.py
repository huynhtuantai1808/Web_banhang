import httpx, asyncio
async def main():
    async with httpx.AsyncClient() as client:
        r=await client.post('http://127.0.0.1:8000/api/v1/auth/login', data={'username':'admin@electronicsshop.com','password':'password'})
        token=r.json()['access_token']
        r2=await client.post('http://127.0.0.1:8000/api/v1/admin/orders/3203316b-a1fe-4a4a-899e-aae3ca566564/send-email', json={'email_type':'confirmation'}, headers={'Authorization':f'Bearer {token}'})
        print(r2.text)
asyncio.run(main())
