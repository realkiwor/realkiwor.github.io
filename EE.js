var urlStart = window.location.pathname.indexOf('/');
var urlStop = window.location.pathname.indexOf('/', urlStart + 1);
var topLevel = '/';

// hello

var EE = {
    auth: false,
    disabledAjaxErrorDialog: false,
    domain: window.location.protocol + '//' + window.location.host,
    defaultUrl: window.location.pathname.substr(urlStart, urlStop + 1),
    coordinatePrecision: 4,
    truncateSeconds: true,
    resultsSlideSpeed: 750,
    numSelect: 100
};

EE.scroll = {
    x: function ()
    {
        return (typeof document.documentElement.scrollLeft !== "undefined" ? document.documentElement.scrollLeft : document.body.scrollLeft);
    },
    y: function ()
    {
        return (typeof document.documentElement.scrollTop !== "undefined" ? document.documentElement.scrollTop : document.body.scrollTop);
    }
};

// Simulates PHP's date function
Date.prototype.format=function(format){var returnStr='';var replace=Date.replaceChars;for(var i=0;i<format.length;i++){var curChar=format.charAt(i);if(replace[curChar]){returnStr+=replace[curChar].call(this);}else{returnStr+=curChar;}}return returnStr;};Date.replaceChars={shortMonths:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],longMonths:['January','February','March','April','May','June','July','August','September','October','November','December'],shortDays:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],longDays:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],d:function(){return(this.getDate()<10?'0':'')+this.getDate();},D:function(){return Date.replaceChars.shortDays[this.getDay()];},j:function(){return this.getDate();},l:function(){return Date.replaceChars.longDays[this.getDay()];},N:function(){return this.getDay()+1;},S:function(){return(this.getDate()%10==1&&this.getDate()!=11?'st':(this.getDate()%10==2&&this.getDate()!=12?'nd':(this.getDate()%10==3&&this.getDate()!=13?'rd':'th')));},w:function(){return this.getDay();},z:function(){return"Not Yet Supported";},W:function(){return"Not Yet Supported";},F:function(){return Date.replaceChars.longMonths[this.getMonth()];},m:function(){return(this.getMonth()<9?'0':'')+(this.getMonth()+1);},M:function(){return Date.replaceChars.shortMonths[this.getMonth()];},n:function(){return this.getMonth()+1;},t:function(){return"Not Yet Supported";},L:function(){return(((this.getFullYear()%4==0)&&(this.getFullYear()%100!=0))||(this.getFullYear()%400==0))?'1':'0';},o:function(){return"Not Supported";},Y:function(){return this.getFullYear();},y:function(){return(''+this.getFullYear()).substr(2);},a:function(){return this.getHours()<12?'am':'pm';},A:function(){return this.getHours()<12?'AM':'PM';},B:function(){return"Not Yet Supported";},g:function(){return this.getHours()%12||12;},G:function(){return this.getHours();},h:function(){return((this.getHours()%12||12)<10?'0':'')+(this.getHours()%12||12);},H:function(){return(this.getHours()<10?'0':'')+this.getHours();},i:function(){return(this.getMinutes()<10?'0':'')+this.getMinutes();},s:function(){return(this.getSeconds()<10?'0':'')+this.getSeconds();},e:function(){return"Not Yet Supported";},I:function(){return"Not Supported";},O:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+'00';},P:function(){return(-this.getTimezoneOffset()<0?'-':'+')+(Math.abs(this.getTimezoneOffset()/60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()/60))+':'+(Math.abs(this.getTimezoneOffset()%60)<10?'0':'')+(Math.abs(this.getTimezoneOffset()%60));},T:function(){var m=this.getMonth();this.setMonth(0);var result=this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/,'$1');this.setMonth(m);return result;},Z:function(){return-this.getTimezoneOffset()*60;},c:function(){return this.format("Y-m-d")+"T"+this.format("H:i:sP");},r:function(){return this.toString();},U:function(){return this.getTime()/1000;}};

// Formatting numbers to work like number_format in PHP
Number.prototype.format = function(number, precision, decimalSeparator, thousandSeparator)
{
    number = (parseFloat(number)).toFixed(precision) + '';
    x = number.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? decimalSeparator + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1))
    {
        x1 = x1.replace(rgx, '$1', + thousandSeparator + '$2');
    }
    
    return x1 + x2;
};

function createGrowl(heading, message)
{
    $.sticky('<b>' + heading + '</b>' +
        '<p>' + message + '</p>');
}

var timeDiff = {
    setStartTime:function (){
        d = new Date();
        time  = d.getTime();
    },

    getDiff:function (){
        d = new Date();
        return (d.getTime()-time);
    }
};

// Add leading zeros to numbers
function padNumber(number, length)
{
    var str = number.toString();
    
    while (str.length < length) 
    {
        str = '0' + str;
    }
        
    return str;
}
