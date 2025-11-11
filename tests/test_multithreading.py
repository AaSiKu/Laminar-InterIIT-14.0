import pathway as pw

get_col = lambda table, col_name: getattr(table, col_name)


class UserSchema(pw.Schema):
    username: str
    email: str

class TransactionSchema(pw.Schema):
    username: str
    amount: float
    currency: str
    status: str

users = pw.debug.table_from_rows(
    UserSchema,
    [
        ("alice", "alice@example.com"),
        ("bob", "bob@example.com"),
    ],
)

transactions = pw.debug.table_from_rows(
    TransactionSchema,
    [
        ("alice", 150, "INR", "success"),
        ("bob", 50, "INR", "failed"),
        ("bob", 200, "USD", "success"),
        ("alice", 200, "USD", "success"),
        ("alice", 20, "USD", "success"),
    ],
)


joined = transactions.join(users, transactions.username == users.username).select(users.username,*[ get_col(users,col) for col in users.without(users.username).column_names()], *[ get_col(transactions,col) for col in transactions.without(transactions.username).column_names()])


pw.io.fs.write(joined,filename='testing.log',format="json")


import asyncio

def start_pathway():
    pw.run()

async def main():

    task = asyncio.create_task(asyncio.to_thread(start_pathway))

    print(transactions.schema)
    while True:
        print("async loop running")
        await asyncio.sleep(1)
    

asyncio.run(main())

