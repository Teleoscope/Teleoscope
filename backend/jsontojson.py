json_in = {}

title_key = 'title'
text_key = 'body'

json_out = {
    'title': str(json_in[title_key]),
    'text': str(json_in[text_key]),
    'meta': json_in,
    'textVector': vectorize(str(json_in[text_key])),
    'relations' : {}
}