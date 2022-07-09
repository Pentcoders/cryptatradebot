function format_two_digits(n) {
    return n < 10 ? '0' + n : n;
}

function time_format(d) {
    hours = format_two_digits(d.getHours());
    minutes = format_two_digits(d.getMinutes());
    seconds = format_two_digits(d.getSeconds());
    return hours + ":" + minutes + ":" + seconds;
}

/**
 * выставляем положения кнопок при старте-стопе и запускаем-останавливаем счётчик
 * @param {type} $form
 * @param {type} robotid
 * @param {type} activebutton
 * @param {type} worktime
 * @returns {undefined}
 */
function dealButtonsCountdownGraphs($form, robotid, activebutton, worktime, isDemo){
    // если требуется кнопки выставить
    if(activebutton) {
        var $countdown = $('.countdown-timer[robot-id="' + robotid + '"]');
        console.log('deal', robotid, worktime, activebutton);

        if(activebutton === 'start') {
            if(!isDemo) {
                robotsApp.setRobot(robotid, false);
            }
            $form.find('.robot-status.st-red').show();
            $form.find('.robot-status.st-green').hide();
            // удаляем хак запуска
            $form.find('.robot-status.st-green').removeClass('st-visible');
            $form.find('.robot-stop').hide();
            $form.find('.robot-start').show();

            // сбрасываем если был until (передаваемый, если запущен робот)
            // и выключаем таймер
            $countdown.data('until', '');
            $countdown.countdown('destroy');
            $countdown.text('00:00:00');
        } else {
            if(!isDemo) {
                robotsApp.setRobot(robotid, true);
            }
            $form.find('.robot-status.st-red').hide();
            $form.find('.robot-status.st-green').show();
            $form.find('.robot-start').hide();
            $form.find('.robot-stop').show();

            $countdown.data('worktime', worktime);
            startCountdownTimer($countdown);

            updateBalanceAndGraphs();
        }
    }
}

$(document).ready(function(){
    $('.form-ajax').ajaxForm({
        dataType: 'json',
        beforeSubmit: function() {
            $('form [type=submit]').attr('disabled', 'disabled');
        },
        success: function(data, statusText, xhr, $form) {
            if(data.status) {
                console.log(data.status);
            }

            // if we got an error, show it
            if(data.error) {
                $('#info-block').html(data.error).removeClass('success').addClass('error').show().delay(3000).fadeOut();
                return;
            }
            // if we got a success message, show it
            if(data.status && !data.error) {
                $('#info-block').html(data.status).removeClass('error').addClass('success').show().delay(3000).fadeOut();
            }
            // if we need a redirect, do it
            if(data.redirect) {
                window.location = data.redirect;
                return;
            }
            
            dealButtonsCountdownGraphs($form, data.id, data.activebutton, data.worktime);
        },
        complete: function(){
            $('form [type=submit]').removeAttr('disabled');
        },
    });
    
    $('[data-onlytab]').on('click', function(){
        $(this).parent().find('input').prop('checked', false);
        $(this).find('input').prop('checked', true);
        
        var target = $(this).data('onlytab');
        
        $(target).parent().find('.tab-pane').hide();
        $(target).show();
    });
    
    
    $('.quantity .plus').on('click', function(e){
        var $el = $(this).prev();
        var el = $el[0];
        
        if(el.step) {
            el.stepUp();
        } else {
            $el.val(Math.min($el.val() * 1 + 1, el.max));
        }
        return false;
    });
    $('.quantity .minus').on('click', function(e){
        var $el = $(this).next();
        var el = $el[0];
        
        if(el.step) {
            el.stepDown();
        } else {
            $el.val(Math.max($el.val() * 1 - 1, el.min));
        }
        return false;
    });
    
    $(document).on('click', '.close-log', function(){
        $(this).parent('.log-item').addClass('log-item-closed').fadeOut(300);
         if($('.log-item-closed').size() > 60) {
            $('.log-item-closed').last().remove();
        }
    });
    
    function popupNotify(ind, dealId, robotname, date, position, amount, optype, asset){
        var $logitem = $('.log-item-example').clone();
        $logitem.attr('data-id', dealId);
        $logitem.find('h5 span').text(robotname);
        $logitem.find('p').html(trans.Executed + ' ' + date + '<br>' + position.toUpperCase() + ' ' + amount + '<br> ' + optype + ' <b>' + asset + '</b>');

        var indDevided = 1. * ind / 5.;
        var groupIndex = Math.floor(indDevided);
        var delay = 3300 * groupIndex;

        $logitem.removeClass('log-item-example').delay(1000 + delay).fadeIn(300).delay(2000).fadeOut(1000);
        $('.log-note-wrap').prepend($logitem);
    }
    
    function updateDealsNotifications() {
        $.getJSON('/last-deals', function(data){
            for(var ind in data.deals){
                var dealId = data.deals[ind].id;
                
                // если сделка уже есть, ничего не делаем
                if($('.log-item[data-id=' + dealId + ']').size() > 0) {
                    continue;
                }

                popupNotify(ind, dealId, data.deals[ind].robotname, data.deals[ind].executed, data.deals[ind].position, data.deals[ind].amount, data.deals[ind].optype, data.deals[ind].name);
            }
        });
    }
    
    // каждые полминуты проверяем последние сделки по всем активным роботам. Если её ещё не выводили, добавляем в стек и выводим. Если в стеке более 60, чистим первый элемент.
    updateDealsNotifications();
    
    setInterval(function(){
        updateDealsNotifications();
    }, 25000);
    
    // клик по меню слева выбирает робота
    $(document).on('click', '.s-menu .selrobot', function(e){
        var $tr = $(e.target).closest('.selrobot');
        console.log('ROBOX onclick for tr', $tr.data('id'));
        // click on mytop
        if($tr.hasClass('mysel')){
            console.log('ROBOX skip ', $(this).data('id'))
            return false;
        }
        
        var robotid = $(this).data('id');
        $('.selrobot').removeClass('active');      
        console.log('set active all selrobot with data-id=', robotid);
        $('.selrobot[data-id=' + robotid + ']').addClass('active');
        
        $('.robot-pane').hide();
        
        var $pane = $('.robot-pane.robot-' + robotid);
        $pane.show();
        
        var userrobot_id = $pane.find('.robot-settings-wrapper').data('userrobot');
        console.log('regraph ' + userrobot_id);
        drawChart(userrobot_id);
    });
    $(document).on('click', '.selrobot a', function(){
        $(this).closest('tr').click();
        return false;
    });
    
    // клик на заголовок выбирает первого робота
    $('.bot-category > h2').on('click', function(){
        $(this).parent().find('a').first().click()
    });
    
    // установка всех ассетов в ноль
    function middleAssetChanges(robotid) {
        var $form = $('form.form-user-robot-' + robotid);
        var $sliders = $form.find('.sliderp');
        var assets = [];

        $sliders.each(function(){
            var assetid = $(this).data('asset');
            var $checkbox = $form.find('input[name="asset[' + assetid + '][status]"]');

            this.noUiSlider.set(0);
            $(this).removeAttr('disabled');
            $checkbox.prop('checked', true);
            
            assets[assets.length] = $(this).data('assetname');
        });
        
        return assets;
    }
    
    // остановка демонстрации
    function stopDemonstration(interval, intervalBalance, $pane, $form, robotid, demobalance) {
        clearInterval(interval);
        clearInterval(intervalBalance);

        dealButtonsCountdownGraphs($form, robotid, 'demo', 0, true);
        $pane.find('.blocked-modal').show();
        $pane.addClass('blocked');

        $pane.find('.blocked-info').hide();
        $pane.find('.demo-info').hide();
        $pane.find('.demo-result').show();
        $pane.find('.demo-result').find('.start').text('1000$');
        $pane.find('.demo-result').find('.end').text(demobalance + '$');
        
        setTimeout(function(){
            $pane.find('.top-warning').removeClass('lower').addClass('nogreen');
            $pane.find('.demo-result').hide();
            $pane.find('.blocked-info').show();            
        }, 6000);

        $('.user-balance').show();
        $('.demo-balance').hide();
        $('.recommended-balance').show();
        $pane.find('.robot-demo-stop').removeClass('robot-demo-stop');
    }
    
    //  работа ДЕМО
    $('.robot-demo-start').on('click', function(){
        var $pane = $(this).closest('.robot-pane');
        var $form = $pane.find('form');
        
        // временно разблокируем блок
        $pane.find('.blocked-modal').hide();
        $pane.removeClass('blocked');
        
        // покажем вместо блокировки  инфу о демо
        $pane.find('.blocked-info').hide();
        $pane.find('.demo-info').show();
        $pane.find('.demo-result').hide();
        $pane.find('.top-warning').removeClass('nogreen');
        $pane.find('.top-warning').addClass('lower');
        $pane.find('.inactive').removeClass('inactive');
        $pane.find('.robot-stop').addClass('robot-demo-stop');

        // основной баланс спрячем, покажем демо
        $('.user-balance').hide();
        $('.demo-balance').text('1000 $').show();
        $('.recommended-balance').hide();

        var robotid = $(this).data('robotid');
        var userrobotid = $(this).data('userrobotid');
        var robotname = $(this).data('robotname');
            
        // выставим все ассеты на середину
        var assets = middleAssetChanges(robotid);
        
        // виртуально стартуем робота
        var timeToWork = 60;
        dealButtonsCountdownGraphs($form, robotid, 'demo', timeToWork, true);
        
        // по клику на стоп останавливаем демонстрацию
        $pane.find('.robot-demo-stop').on('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            
            stopDemonstration(interval, intervalBalance, $pane, $form, robotid, demobalance);
            return false;
        });
        
        // случайные позиция, сумма и ассет
        var interval = setInterval(function(){
            var doRand = Math.random();
            var doAction = doRand < 0.33 ? true : false;
            
            if(doAction) {
                var position = Math.random() > 0.5 ? sellName : buyName;
                var amountRandom = Math.random();
                var amount =  amountRandom < 0.33 ? 10 : ( amountRandom < 0.67 ? 50 : 100);
                
                var date = time_format(new Date());
                var optype = ''; // 60sec or
                
                var randAsset = Math.ceil(Math.random() * assets.length) - 1;
                var assetname = assets[randAsset];
                popupNotify(0, Math.random(), robotname, date, position, amount + '$', optype, assetname);
            }
            
            if(doRand < 0.2) {
                $form.find('.sliderp').each(function(){
                    this.noUiSlider.set(Math.random() * 2 - 1);
                });
            }
        }, 1000);
        
        var demobalance = 1000;
        
        // рисование графика единоразово (точка) и затем интервально
        var demobalances = [
            ['time', 'balance'],
            [format_two_digits(new Date()), demobalance],
        ];
        drawingChartFromData(demobalances, userrobotid);
        
        var intervalBalance = setInterval(function(){
            var add = Math.round(Math.random() * 90 + 10);
            demobalance += add;
            demobalances[demobalances.length] = [format_two_digits(new Date()), demobalance];
            
            $('.demo-balance').text(demobalance + ' $');    
            drawingChartFromData(demobalances, userrobotid);
        }, 9800);
                
        
        // а спустя время возвращаем всё назад и отключаем таймеры
        setTimeout(function(){
            stopDemonstration(interval, intervalBalance, $pane, $form, robotid, demobalance);
        }, timeToWork * 1000);
        
        return false;
    });
});