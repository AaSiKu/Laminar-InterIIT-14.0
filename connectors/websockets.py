import json, logging, os, sys, time
from datetime import datetime
import asyncio, aiohttp, websockets
from dotenv import load_dotenv
import pathway as pw
from aiohttp.client_ws import ClientWebSocketResponse

#TODO: Add polygon API Key to .env file
load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(message)s")

class StockAggregates(pw.Schema):
    sym: str
    Open: float
    close: float
    high: float
    low: float
    volume: int
    start: datetime
    end: datetime

class AIOHttpWebsocketSubject(pw.io.python.ConnectorSubject):
    _url: str

    def __init__(self, url: str):
        super().__init__(AIOHttpWebsocketSubject)
        self._url = url

    def run(self):
        async def consume():
            async with aiohttp.ClientSession() as session:
                async with session.ws_connect(self._url) as ws:
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.CLOSE:
                            break
                        else:
                            result = await self.on_ws_message(msg, ws)
                            for row in result:
                                self.next_json(row)

        asyncio.new_event_loop().run_until_complete(consume())
    async def on_ws_message(self, msg: aiohttp.WSMessage, ws: ClientWebSocketResponse) -> list[dict]:
        raise NotImplementedError

class PolygonSubject(AIOHttpWebsocketSubject):
    _api_key: str
    _symbols: str
    def __init__(self, url: str, api_key: str, symbols: str) -> None:
        super().__init__(url)
        self._api_key = api_key
        self._symbols = symbols

    async def on_ws_message(self, msg: aiohttp.WSMessage, ws: ClientWebSocketResponse) -> list[dict]:
        if msg.type == aiohttp.WSMsgType.TEXT:
            result = []
            payload = json.loads(msg.data)
            for object in payload:
                match object:
                    case {"ev": "status", "status": "connected"}:
                        await self._authorize(ws)
                    case {"ev": "status", "status": "auth_success"}:
                        await self._subscribe(ws)
                    case {"ev": "A"}:
                        result.append(object)
                    case {"ev": "status", "status": "error"}:
                        raise RuntimeError(object["message"])
                    case _:
                        raise RuntimeError(f"Unhandled payload: {object}")
            return result
        else:
            return []

    # TODO: Add authorization to the websocket
    # TODO: Add subscription functionality
    async def _authorize(self, ws: ClientWebSocketResponse):
        await ws.send_json({"action": "auth", "params": self._api_key})

    async def _subscribe(self, ws: ClientWebSocketResponse):
        await ws.send_json({"action": "subscribe", "params": self._symbols})

# def main():
#
#     URL = "wss://delayed.polygon.io/stocks"
#     API_KEY = os.getenv("POLYGON_API_KEY")
#     SYMBOLS = os.environ.get("TICKER_SYMBOLS", ".*")
#
#     subject = PolygonSubject(url=URL, api_key=API_KEY, symbols=SYMBOLS)
#
#     table = pw.io.python.read(subject, schema=StockAggregates)
#
#     def on_change(key: pw.Pointer,row: dict,time: int,is_addition: bool):
#         if is_addition:
#             logging.info(f"{time}: {row}")
#     pw.io.subscribe(table, on_change)
#     pw.run()
#
# if __name__ == "__main__":
#     main()
