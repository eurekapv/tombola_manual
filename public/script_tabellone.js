var timer_update = null;
var last_called = 0;
var last_removed = -1;
var ok_status = null;
/**@type {boolean} */
var showBtnEstrai=false;

$(document).ready(function() {
    console.log('Ready!');

    var table = '';
    for (var i = 1; i < 91; i++) {
        if (i % 10 == 1) table += '<tr>';
        table += '<td><div class="number" id="number-' + i + '">' + i + '</div></td>';
        if (i % 10 == 0) table += '</tr>';
    }

    startUpdate();
    $('#tavola').html(table);
    $('#btnCall').click(function() {
        $.getJSON('/endpoint/board_extract/?room_name=' + board_options.room_slug, function(res) {
            if (res.status === 'OK') {
                printNum(res.data.board.last_called.toString(), '#last-called-holder', 'big-number');
                $('#number-' + res.data.board.last_called).addClass('called');
                last_called = res.data.board.last_called;
                last_removed = res.data.board.last_removed;
            } else {
                console.log(res.message);
                if (res.status === 'WARN') 
                    showAlert(res.message);
            }
        });
    });
    if (!showBtnEstrai) {
        $('#btnCall').hide();
    }

    $('#btnReset').click(function() {
        resetBoard(true);
    });
    $('#btnRefresh').click(function() {
        if ($(this).data('state') == 'on') {
            $(this).html('Sincronizza: off');
            $(this).data('state', 'off');
            stopUpdate();
        } else {
            $(this).html('Sincronizza: on');
            $(this).data('state', 'on');
            startUpdate();
        }
    });
    //Applico un event Click ai numeri
    for (let i = 1; i < 91; i++) {
        $(`#number-${i}`).click(function (ev) {
            ev.preventDefault();
            let numberDom = ev.target;
            if (numberDom && numberDom.id && numberDom.id.length != 0) {
                let selectedNumber = numberDom.id.replace('number-','');
                //Faccio la chiamata   
                let endPoint = `/endpoint/board_choose_extract/?room_name=${board_options.room_slug}&choose_number=${selectedNumber}`;
                console.log('Chiamata a '+ endPoint);

                $.getJSON(endPoint, function(res) {
                    if (res.status === 'OK') {
                        //Numero è stato estratto correttamente
                        if (res.data.board.last_action == 'add') {
                            printNum(res.data.board.last_called.toString(), '#last-called-holder', 'big-number');
                            $('#number-' + res.data.board.last_called).addClass('called');
                            last_called = res.data.board.last_called;
                            last_removed = res.data.board.last_removed;
                        }
                        else {
                            //Ultimo chiamato
                            last_called = res.data.board.last_called;
                            last_removed = res.data.board.last_removed;
                            //Tolgo la classe di riferimento
                            console.log($('#number-' + selectedNumber));
                            $('#number-' + selectedNumber).removeClass('called');
                            
                        }

                    } else {
                        console.log(res.message);
                        if (res.status === 'WARN') 
                            showAlert(res.message);
                    }
                });
            }
            
            
        });
    };
});

// Avvia e arresta il timer di aggiornamento del tabellone
function startUpdate() { timer_update = setInterval(getRoom, 1000); }
function stopUpdate() { clearInterval(timer_update); }

// Ottiene i dati dall'endpoint e aggiorna il tabellone
function getRoom() {
    $.getJSON('/endpoint/get_board/?room_name=' + board_options.room_slug, function(res) {
        var status = true;

        if (res.status === 'OK') {

            //Aggiornamento tabellone ultimi numeri estratti
            if (res.data.board.last_action == 'remove') {
                
                if (last_removed == res.data.board.last_removed) {
                    last_removed = -1;
                    //Ridisegno gli utlimi estratti
                    $('#last-called-holder').html('');
                    for (var i = res.data.board.called_list.length - 4; i < res.data.board.called_list.length; i++) {
                        if (i >= 0) {
                            printNum(res.data.board.called_list[i].toString(), '#last-called-holder', 'big-number');
                        }
                    }
                }
            }

            if (res.data.board.last_called != last_called) {
                if (res.data.board.last_called == -1) resetBoard();
                $.each(res.data.board.called_list, function(pos, num) {
                    $('#number-' + num).addClass('called');
                });
                $('#last-called-holder').html('');
                for (var i = res.data.board.called_list.length - 4; i < res.data.board.called_list.length; i++) {
                    if (i >= 0) {
                        printNum(res.data.board.called_list[i].toString(), '#last-called-holder', 'big-number');
                    }
                }
                last_called = res.data.board.last_called;
            }
        } else {
            status = false;
            console.log(res.message);
        }

        if (ok_status === null || status != ok_status) {
            ok_status = status;

            if (ok_status) {
                switchPanel('#global_msgs', '#board');
                
                if (mobileCheck()) {
                    console.log('Oh, you\'re on mobile!');
                    $('#fullscreenAlert').fadeIn();
                    $('body').addClass('smartphone');
                }
            } else {
                switchPanel('#board', '#global_msgs');
                $('#global_msgs').html(res.message).addClass('red');
            }
        }
    });
}

// Pulisce il tabellone
function resetBoard(reset_room = false) {
    $('.number').removeClass('called');
    $('#last-called-holder').html('');
    if (reset_room) $.getJSON('/endpoint/board_reset/?room_name=' + board_options.room_slug);
}

// Aggiunge un numero al contenitore degli ultimi numeri chiamati
function printNum(num, container_sel, items_sel) {
    var elem = `<div class="called-number" id="cn-${num}"><div class="called-number-container">`;
    if (num < 10) elem += '<div class="' + items_sel + ' n0"></div>';
    for (var i = 0; i < num.length; i++)
        elem += '<div class="' + items_sel + ' n' + num[i] + '"></div>';
    $(container_sel).prepend(elem + '</div></div>');
    if ($(container_sel + '> div').children().length > 4)
        $(container_sel + '> div').last().remove();
}



// Swap dei pannelli a schermo
function switchPanel(from, to) {
    if (($(from).css('display') == 'none')) {
        console.log('hidden');
        $(to).fadeIn(500);
    } else {
        $(from).fadeOut(500, function() {
            $(to).fadeIn(500);
        });
    }
}

// Mostra un alert al centro dello schermo con messaggio <alert_text> per <timeout> secondi (def. 2 secondi)
function showAlert(alert_text, panel_id = '#alert_panel', timeout = 2000) {
    $(panel_id + ' > h1').html(alert_text);
    showPanel(panel_id, timeout);
}

// Cambia la visibiltià di un pannello a schermo per <timeout> secondi (def. disabilitato)
function showPanel(panel_id, timeout = false) {
    $(panel_id).fadeIn(100, function() { 
        $(panel_id).animate({ zoom: 1.1, speed: 200 }, { easing: 'swing', done: function() { 
                $(panel_id).animate({ zoom: 1, speed: 100 }, { easing: 'swing' });
            } 
        });
    });
    if (timeout !== false) setTimeout(function() { $(panel_id).fadeOut(200) }, timeout);
}