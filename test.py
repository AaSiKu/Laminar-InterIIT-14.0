import pathway as pw
t1 = pw.debug.table_from_markdown('''
td  | owner | pet
u   | 16788 | dog
b   | 333   | dog
c   | 9876  | cat
d   | 12    | dog
''')
pw.debug.compute_and_print(t1)
t2 = t1.select(ids = t1.id)
print(t1.schema)
pw.debug.compute_and_print(t2.select(test=t2.id == t2.ids,ids=t2.ids,_id=t1.id))