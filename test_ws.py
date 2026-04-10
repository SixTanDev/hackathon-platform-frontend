import asyncio
import websockets
import json

async def test_ws(url):
    try:
        async with websockets.connect(url) as ws:
            print(f"Connected to {url}")
            return True
    except Exception as e:
        print(f"Failed to connect to {url}: {e}")
        return False

# Test variations
base = "wss://apisamp.gruslin.tech"
token = "test_token" # This will likely fail auth but show if path exists

urls = [
    f"{base}/ws/notifications?token={token}",
    f"{base}/api/v1/ws/notifications?token={token}",
]

async def main():
    for url in urls:
        await test_ws(url)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Script error: {e}")
