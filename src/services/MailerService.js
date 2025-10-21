const nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
const { mailerConfig } = require('../config'); // destructure correctly

class MailerService {
  config = {};
  transporter;
  constructor() {
    this.config = mailerConfig;   
    // ✅ Debug log to confirm values
    console.log("📧 Mailer using:", this.config);
    console.log("host:", this.config.host, "port:", this.config.port);
  
    this.transporter = nodemailer.createTransport({
      host: this.config.host,    // 127.0.0.1
      port: this.config.port,    // 1025
      secure: false,             // MailHog does not use SSL
      auth: this.config.user && this.config.pass ? {
        user: this.config.user,
        pass: this.config.pass
      } : undefined,             // Skip auth if empty
      tls: {
        rejectUnauthorized: false
      }
    });
  
    this.transporter.use(
      "compile",
      hbs({
        viewEngine: {
          extname: ".handlebars",
          layoutsDir: "src/utils/emailTemplate/views/layouts/",
          partialsDir: "src/utils/emailTemplate/views/layouts/",
          defaultLayout: "main.handlebars",
        },
        viewPath: "src/utils/emailTemplate/views/",
        extName: ".handlebars",
        cache: false,
      })
    );
  }

  _sendMail(to, subject, html) {
    const options = {
      from: this.config.from,
      to,
      subject,
      html
    };
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  async verify(to, name, vendor_id, password) {
    return new Promise((resolve, reject) => {
      this.transporter.verify((err, success) => {
        if (!err) {
          console.log('Server is ready to take our messages');
          this.sendPassword(to, name, vendor_id, password);
          resolve(success);
        } else {
          console.log('Not verified', err);
          reject(err);
        }
      });
    });
  }
  verifyToken(smsToken, to, name) {
    return new Promise((resolve, reject) => {
      this.transporter.verify((err, success) => {
        if (!err) {
          console.log('Server is ready to take our messages');
          this.sendSMSToken(smsToken, to, name);
          resolve(success);
        } else {
          console.log('Not verified', err);
          reject(err);
        }
      });
    });
  }

  sendFieldPassword(to, name, password) {
    // const body = `
    // <div>
    //   <p>Hi, ${name}\nYour CHATS account ${
    //   vendor_id
    //     ? 'ID is: ' + vendor_id + ', password is: ' + password
    //     : 'password is: ' + password
    // }</p>
    //   <p>Best,\nCHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Your Field Agent Account Credentials',
      // html: body
      isHtml: false,
        template: "fieldDetails",
        context: 
        {
          name,
          password
        }, 
        layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendPassword(to, name, vendor_id, password) {
    // const body = `
    // <div>
    //   <p>Hi, ${name}\nYour CHATS account ${
    //   vendor_id
    //     ? 'ID is: ' + vendor_id + ', password is: ' + password
    //     : 'password is: ' + password
    // }</p>
    //   <p>Best,\nCHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Your Vendor Account Credentials',
      // html: body
      isHtml: false,
        template: "vendorDetails",
        context: 
        {
          name,
          vendor_id,
          password
        }, 
        layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  sendSMSToken(smsToken, to, name) {
    // const body = `
    // <div>
    //   <p>Hello ${name},</p>
    //   <p>Your Convexity token is: ${smsToken}</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'SMS Token',
      // html: body
      isHtml: false,
      template: "sendSMSToken",
      context: 
      {
        name,
        smsToken
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendVendorOTP(otp, ref, to, name) {
    // const body = `
    // <div>
    //   <p>Hello ${name},</p>
    //   <p>Your Convexity reset password OTP is: ${otp} and ref is: ${ref}</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Vendor Registration OTP',
      // html: body
      isHtml: false,
      template: "vendorRegistration",
      context: 
      {
        name,
        otp,
        ref
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendOTP(otp, ref, to, name) {
    // const body = `
    // <div>
    //   <p>Hello ${name},</p>
    //   <p>Your Convexity reset password OTP is: ${otp} and ref is: ${ref}</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Reset password',
      // html: body
      isHtml: false,
      template: "resetPasswordOTP",
      context: 
      {
        name,
        otp,
        ref
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  sendInvite(to, token, campaign, ngo, exist, message, link) {
    const {id, title } = campaign;

    // const body = `
    // <div>
    //   <p>Hi ${to.match(/^([^@]*)@/)[1]} !</p>
    //   <p>We’ve given you access to campaign titled: ${
    //     campaign.title
    //   } so that you can manage your journey with us and get to know all the possibilities offered by CHATS.</p>
    //   <p>${
    //     exist
    //       ? `If you want to login to confirm access, please click on the following link: ${link}/?token=${token}&campaign_id=${campaign.id}`
    //       : `If you want to create an account, please click on the following link: ${link}/?token=${token}&campaign_id=${campaign.id}`
    //   }</p>
    //   <p>${message}</p>
    //   <p>Enjoy!</p>
    //   <p>Best,</p>
    //   <p>The ${ngo} team</p>
    //   </div>
    // `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Donor Invitation',
      // html: body
      isHtml: false,
      template: "sendDonorInvite",
      context: 
      {
        to,
        token,
        id,
        title,
        ngo, 
        exist,
        message,
        link
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendAdminSmsCreditMail(to, amount) {
    // const body = `
    // <div>
    //   <p>Hello Admin,</p>
    //   <p>This is to inform you that your SMS service balance is running low. Current balance is ${amount}. Please recharge your account.</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to: [to, 'charles@withconvexity.com'],
      subject: 'Recharge Your Wallet Balance',
      // html: body
      isHtml: false,
      template: "sendAdminSMSCreditMail",
      context: 
      {
        amount
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendAdminNinCreditMail(to, amount) {
    // const body = `
    // <div>
    //   <p>Hello Admin,</p>
    //   <p>This is to inform you that your NIN service balance is running low. Current balance is ${amount}. Please recharge your account</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to: [to, 'charles@withconvexity.com'],
      subject: 'Recharge Your Wallet Balance',
      // html: body
      isHtml: false,
      template: "sendAdminNINCreditMail",
      context: 
      {
        amount
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendAdminBlockchainCreditMail(to, amount) {
    // const body = `
    // <div>
    //   <p>Hello Admin,</p>
    //   <p>This is to inform you that your Blockchain service balance that covers for gas is running low. Current balance is ${amount}. Please recharge your account</p>
    //   <p>CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to: [to, 'charles@withconvexity.com'],
      subject: 'Recharge Your Wallet Balance',
      // html: body
      isHtml: false,
      template: "sendAdminBlockchainCreditMail",
      context: 
      {
        amount
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  sendEmailVerification(to, orgName, url) {
    // const body = `
    // <div>
    // <h2>Hello, ${orgName}</h2>
    // <p>Thank you for  creating an account on CHATS platform. 
    // Please confirm your email by clicking on the following link</p>
    // <a href="${url}"> Click here</a>
    //   <p>Best,\n CHATS - Convexity</p>
    // </div>
    // `;
    const options = {
      from: this.config.from,
      to: to,
      subject: 'Please confirm your account',
      // html: body
      isHtml: false,
      template: "sendEmailVerification",
      context: 
      {
        orgName,
        url
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('NGO Verification Mail Sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  ngoApprovedMail(to, orgname) {
//     const body = `
//     <div>
//     <h2>Congratulations, ${orgname}</h2>
//     <p>Your Account has been approved be CHATS Admin, This means you can start creating Campaigns.<br/>
// If you have any questions, please contact us via the contact form on your dashboard.</p>
//     <a href="https://chats.cash/"> Click here To Get Started</a>
//       <p>Regards,\n CHATS - Convexity</p>
//     </div>
//     `;
    const options = {
      from: this.config.from,
      to: to,
      subject: 'Congratulations Account Approved!',
      // html: body
      isHtml: false,
      template: "ngoApprovedMail",
      context: 
      {
        orgname
      }, 
      layout: false,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('NGO Verification Mail Sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = new MailerService();
