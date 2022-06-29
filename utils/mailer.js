var _ = require('lodash');	
var nodemailer = require('nodemailer');

var defaultMail = {
    from: 'Me ' + process.env.GMAIL_ID,
    text: 'test text',
};

var transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.GMAIL_ID,
        pass: process.env.GMAIL_PSW
    }
});
module.exports.send = function(mail){
    // use default setting
    mail = _.merge({}, defaultMail, mail);

    
    // send email
    transporter.sendMail(mail, function(error, info){
        if(error) return console.log(error);
        console.log('mail sent:', info.response);
    });
};