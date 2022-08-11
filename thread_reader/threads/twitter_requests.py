import requests, environ

M = 'mock'
R = 'real'
env = environ.Env()

class Fetcher:
    """Provee metodos para interactuar con algunos endpoints del api de Twitter.
    """

    def __init__(self, mode):
        self.mode = mode
        self.tweet = None
        self.thread = []

    def set_mocks(self, mocks):
        self.tweet, *self.thread = mocks   #descompongo la lista en las dos variables

    def obtain_tweet(self, twt_id):
        if self.mode is M:
            res = self.tweet
        else:
            res = self.__request_tweet(twt_id)
        return res

    def __request_tweet(self, twt_id):
        url = f'https://api.twitter.com/2/tweets/{twt_id}'
        payload = {'tweet.fields': 'created_at,attachments,conversation_id,entities', 'expansions': 'author_id,attachments.media_keys', 'media.fields': 'url'}  #TODO agregar public_metrics
        heads = {'Authorization': f'Bearer { env("BEARER_TOKEN") }'}
        return requests.get(url, params=payload, headers=heads).json()

    def obtain_thread(self, twid, token=None):
        if self.mode is M:
            res = self.thread.pop(0)
        else:
            res = self.__request_thread(twid, token)
        return self.__compose_thread(res)

    def __request_thread(self, twid, token):
        url = 'https://api.twitter.com/2/tweets/search/recent'
        payload = {
            'query': f'in_reply_to_tweet_id: {twid}', 
            'tweet.fields': 'referenced_tweets,entities,attachments', 
            'expansions': 'author_id,attachments.media_keys', 
            'media.fields': 'url', 
            'user.fields': 'name,username'
            }
        if token is not None:
            payload['next_token'] = token
        heads = {'Authorization': f'Bearer { env("BEARER_TOKEN") }'}
        return requests.get(url, params=payload, headers=heads).json()

    # construimos un nuevo json iterando sobre la respuesta
    def __compose_thread(self, res):
        try:
            media = res['includes']['media']
        except KeyError:
            media = []

        conjunto = self.__zip_data(res['data'], res['includes']['users'], media, res['meta']['result_count'])
        merged = map(self.__merge_tweet_data, conjunto)  # creamos nueva lista con datos obtenidos al iterar sobre el conjunto
        filtrados = list(filter(None, merged))                 # filtro los None que quedaron en el medio

        try:
            token = res['meta']['next_token']
        except KeyError:
            token = False

        return {'token': token, 'items': filtrados}

    def __zip_data(self, data, users, media, count):
        conjunto = []
        for n in range(count):
            datos = data[n]
            usuarios = [user for user in users if user['id'] == datos['author_id']][0]  # el [0] es para tomar el primero y unico item de la lista generada
            urls = self.__get_urls(data[n]['attachments']['media_keys'], media) if ('attachments' in datos) else []
            conjunto.append((datos, usuarios, urls))
        return conjunto

    def __get_urls(self, keys, media):
        return [m['url'] for m in media if (m['media_key'] in keys) and m['type'] == 'photo']

    def __merge_tweet_data(self, tupla):
        return {
                # 'text': self.__demention(tupla[0]['text'], tupla[0]['entities']),
                'text': tupla[0]['text'],
                'id': tupla[0]['id'],
                'user_id': tupla[1]['id'],
                'username': tupla[1]['username'],
                'name': tupla[1]['name'],
                'urls': tupla[2]
            }

    # quita la mencion del texto
    def __demention(self, texto, ents):
        pos = ents['mentions'][0]['end'] + 1
        return texto[pos:]
