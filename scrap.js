var cheerio = require('cheerio');
var request = require('request');
var firebase = require("firebase");

/** SET keyword for searching **/
var KEYWORD = "SEARCHKEYWORD"


/** Init firebase **/
firebase.initializeApp({
    serviceAccount: "SERVICEACCOUNT.json",
    databaseURL: "DATABASE.firebaseio.com/"
});
var db = firebase.database();
var pantipRef = db.ref("pantip_"+KEYWORD);

/** Search by pantip smart search for gather all posts about KEYWORD */
var baseUrl = "http://search.pantip.com/"
var searchUrl = baseUrl + "ss?s=a&nms=1&sa=Smart+Search&q="+KEYWORD;
var options = {
    url: searchUrl,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
        'accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    }
};
request(options, function(err, resp, html) {
    $ = cheerio.load(resp.body);

    links = $('a');
    var title = [];
    $(links).each(function(i, link) {
        var options = {
            url: baseUrl + $(link).attr('href'),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
                'accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        request(options, function(err, resp, html) {
            $ = cheerio.load(resp.body);

            if (title.indexOf($('.display-post-title').text()) == -1) {

                title.push($('.display-post-title').text());
                var id = $('.display-post-wrapper').attr('id');
                var topicRef = pantipRef.child(id);
                topicRef.set({
                	title: $('.display-post-title').text(),
                    time: $('.display-post-timestamp').children().attr('data-utime'),
                    story: $('.display-post-story').text(),
                    author: $('.display-post-name').text(),
                    author_url: $('.display-post-name').attr('href')
                });

                var options = {
                    url: 'http://pantip.com/forum/topic/render_comments?tid=' + $('link[rel="canonical"]').attr('href').split('/')[4],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
                        'accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                };
                request(options, function(err, resp, html) {
                    var comments = [];
                    var topicId = "topic-"+JSON.parse(resp.body).paging.topic_id;
                    for (var j = 0; j < JSON.parse(resp.body).comments.length; j++) {
                        comments.push({
                            "user": JSON.parse(resp.body).comments[j].user.name,
                            "link": JSON.parse(resp.body).comments[j].user.link,
                            "message": JSON.parse(resp.body).comments[j].message,
                            "time": JSON.parse(resp.body).comments[j].data_utime
                        });
                        if (JSON.parse(resp.body).comments[j].replies.length > 0) {
                            for (var k = 0; k < JSON.parse(resp.body).comments[j].replies.length; k++) {
                                comments.push({
                                    "user": JSON.parse(resp.body).comments[j].replies[k].user.name,
                                    "link": JSON.parse(resp.body).comments[j].replies[k].user.link,
                                    "message": JSON.parse(resp.body).comments[j].replies[k].message,
                                    "time": JSON.parse(resp.body).comments[j].replies[k].data_utime
                                })
                            }
                        }
                    }
                    
                    var topicRef = pantipRef.child(topicId);
                    topicRef.update({
                    	comments: comments
                    })
                })
            }
        });
    });
})
