let media_url = undefined;
let more_url = undefined;
let open_url = undefined;

function storeUrls(media, more, open) {
    media_url = media;
    more_url = more;
    open_url = open;
}

function moreReplies(boton) {
    const fila = boton.parent();
    const tok = boton.attr('data-token');
    const twid = fila.attr('data-id');
    $.ajax(
        {
            type: 'GET',
            url: more_url,
            data: {
                token: tok,
                twid: twid,
            },
            success: function (res) {
                console.log('respuestas cargadas con exito!');
                console.log('cantidad: ' + res.items.length);
                const tweets = prepareTweets(res);
                if (res.token) {
                    tweets.push(boton.attr('data-token', res.token));   //actualizo el token y muevo el boton al final de la lista
                } else {
                    boton.remove();
                }
                fila.append(tweets);
            }
        }
    );
};

//genera el html y define los handlers a eventos
function prepareTweets(res) {
    const tweets = generateElements(res);
    tweets.forEach(t => setTweetHandlers(t));
    return tweets;
}

function setTweetHandlers(tweet) {
    setClickHandler(tweet);
    setMouseHandlers(tweet);
}

function setClickHandler(tweet) {
    tweet.click(function () {
        if (!$(this).hasClass('active')) {
            openThread($(this));
        } else {
            closeThread($(this));
        }
    });
}

function setMouseHandlers(tweet) {
    tweet.mouseenter(function () {
        $(this).addClass('focused');
    });
    tweet.mouseleave(function () {
        $(this).removeClass('focused');
    });
}

function generateElements(res) {
    const elems = [];
    for (let i = 0; i < res.items.length; i++) {
        const parrafo_meta = $('<p/>', {
            'class': 'user-name',
            html: res.items[i].name
        });
        const link = $('<a/>', {
            'class': 'link',
            href: `https://twitter.com/${res.items[i].username}/status/${res.items[i].id}`,
            target: '_blank',
            html: 'link'
        })
        const metadata = $('<div/>', {
            'class': 'article-metadata',
            html: [parrafo_meta, link]
        });
        const parrafo_cont = $('<div/>', {
            'class': 'article-content',
            html: res.items[i].text
        });
        const articulo = $('<article/>', {
            'class': 'content-section',
            'data-id': res.items[i].id,
            html: [metadata, parrafo_cont, link]
        });
        elems.push(articulo);
    }
    return elems;
}

function openThread(reply) {
    const fila = reply.parent();
    const container = fila.parent();
    const lvl = extractLevel(reply);
    const twid = reply.attr('data-id');
    reply.off('mouseleave');    //desactivo el handler de cuando saco el mouse
    reply.addClass('active');
    fila.addClass('locked-thread');
    fila.children('article:not(.active)').off('click mouseenter mouseleave');    //desactivo el handler de click para todos los otros tweets
    fila.find('.load-more').off('click')
    const new_fila = $('<div/>', {
        id: 'lv-' + (lvl+1),
        'class': 'fila',
        'data-id': twid
    });
    $.ajax(
        {
            type: 'GET',
            url: open_url,
            data: {
                twid: twid
            },
            success: function (res) {
                console.log('thread abierto con exito!');
                console.log('cantidad: ' + res.items.length);
                const tweets = prepareTweets(res);
                if (res.token) {
                    const btn = $('<a/>', {
                        'class': 'load-more btn btn-primary btn-lg',
                        'data-token': res.token,
                        html: $('<img/>', {
                            src: media_url + '/icons/circle-plus-solid.svg',
                            alt: 'cargar mas'
                        })
                    });
                    btn.click(function () {
                        moreReplies($(this));
                    });
                    tweets.push(btn);
                }
                new_fila.append(tweets);
                $('#lv-' + (lvl+1)).replaceWith(new_fila);
                container.append($('<div/>', {  //dejo una fila vacia para el siguiente openThread
                    id: 'lv-' + (lvl+2),
                    'class': 'fila'
                }));
            }
        }
    );
}

//tomo el numero de la fila
function extractLevel(reply) {
    return parseInt(reply.parent().attr('id').substr(3));
}

function closeThread(reply) {
    const fila = reply.parent();
    const container = fila.parent();
    const lvl = extractLevel(reply);
    fila.removeClass('locked-thread');
    fila.children('article:not(.active)').each(function () {
        setTweetHandlers($(this));
    });
    fila.find('.load-more').click(function () {
        moreReplies($(this));
    });
    container.children().slice(lvl+1).remove();   //borro las filas que vienen delante
    container.append($('<div/>', {
        id: 'lv-' + (lvl+1),
        'class': 'fila'
    }));
    reply.mouseleave(function () {
        $(this).removeClass('focused');
    });
    reply.removeClass('active');
}
