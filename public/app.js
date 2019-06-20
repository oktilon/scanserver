$(function(){
    updateEvent();
});

function updateEvent() {
    $.ajax({
        url: '/event',
        method: 'GET',
        success: function(ans) {
            var txt = JSON.stringify(ans, null, 4);
            var htm = syntaxHighlight(txt);
            $('#event').html(htm);
            $('#status')
                .removeClass('off')
                .removeClass('unk')
                .addClass('on')
                .html('online');
            setTimeout(updateEvent, 1000);
        },
        error: function(err) {
            $('#event').html('');
            $('#status')
                .removeClass('on')
                .removeClass('unk')
                .addClass('off')
                .html('offline');
            setTimeout(updateEvent, 1000);
        }
    });
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}