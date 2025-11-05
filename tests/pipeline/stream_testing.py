import pathway as pw

class UserSchema(pw.Schema):
    id: str
    name: str
    email: str
    job: str

users = pw.io.http.read(
    url="http://localhost:5050/stream-users",
    format="json",
    schema=UserSchema,
)

pw.io.jsonlines.write(users, "output.log")

pw.run()
