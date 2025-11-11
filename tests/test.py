import pathway as pw
t1 = pw.debug.table_from_markdown('''
   | age | owner  | pet
 1 | 10  | Alice  | 1
 2 | 9   | Bob    | 1
 3 | 8   | Alice  | 2
''')
t2 = pw.debug.table_from_markdown('''
   | bge | owner  | det
 1 | 10  | Alice  | 1
 2 | 9   | Bob    | 1
 3 | 8   | Alice  | 2
''')

t3 = t1.join(t2,t1.owner == t2.owner).select(
    *t1.without("pet")
)
pw.debug.compute_and_print(t3)