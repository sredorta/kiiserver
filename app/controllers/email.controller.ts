import {Request, Response, NextFunction} from 'express'; 
import {Setting} from '../models/setting';
import {HttpException} from '../classes/HttpException';
import {messages} from '../middleware/common';

import { Middleware } from '../middleware/common';
import nodemailer from 'nodemailer';
import {AppConfig} from '../utils/Config';
import {body} from 'express-validator/check';
import { CustomValidators } from '../classes/CustomValidators';
import { User } from '../models/user';
import { SettingTranslation } from '../models/setting_translation';
import pug from 'pug';
import path from 'path';
import { Article } from '../models/article';
import htmlToText from 'html-to-text';
import InlineCss from 'inline-css';
import { IsPhoneNumber } from 'class-validator';
import { Email } from '../models/email';
import { EmailTranslation } from '../models/email_translation';

export class EmailController {
    /**Email transporter check */
    public static emailCheck = async (req: Request, res: Response, next:NextFunction) => {
        const transporter = nodemailer.createTransport(AppConfig.emailSmtp);
        let myResult = {
            host: AppConfig.emailSmtp.host,
            port: AppConfig.emailSmtp.port,
            secure: AppConfig.emailSmtp.secure,
            sender: AppConfig.emailSmtp.sender,
            verification: ""
        }
        transporter.verify(function(error, success) {
            if (error) 
                 myResult.verification = "error";
            else 
                myResult.verification = "success";
            res.send(myResult);
         });
    }

    /**Gets all email templates */
    public static getAll = async (req: Request, res: Response, next:NextFunction) => {
        try {
            res.json(await Email.findAll());
        } catch(error) {
            next(error);
        }
    }

    /**Returns the html of the current email in all languages for previewing*/
    public static preview = async (req: Request, res: Response, next:NextFunction) => {
        try {
            //Build an email model without saving so that we can use for preview
            let result :any = {};
            let myEmail = Email.build(req.body.email, {
                isNewRecord: false,
                include: [EmailTranslation]
             });
            if (!myEmail) throw new HttpException(500, messages.validationDBMissing('email'),null);           
            for (let lang of Middleware.languagesSupported()) {
                result[lang] = await myEmail.getHtml(lang); 
            }
            res.json(result);
        } catch(error) {
            next(error);
        }
    }
    /**Parameter validation */
    static previewChecks() {
        return [
            body('email.id').exists().withMessage('exists').custom(CustomValidators.dBExists(Email,'id')),
            Middleware.validate()
        ]
    }    

    /**Updates email template */
    static update = async (req: Request, res: Response, next:NextFunction) => {
        try {
            console.log(req.body.email);
            let myEmail = Email.build(req.body.email, {
                isNewRecord: false,
                include: [EmailTranslation]
             });
             if (!myEmail) throw new HttpException(500, messages.validationDBMissing('email'),null);           
            myEmail = await myEmail.save();

            res.json(myEmail);

/*            let article = await Article.findByPk(req.body.article.id);
            let myUser = await User.scope("withRoles").findByPk(req.user.id);            
            if (article && myUser) {
                if (article.cathegory=="blog" && !(myUser.hasRole("blog") || myUser.hasRole("admin"))) {
                    return next(new HttpException(403, messages.authTokenInvalidRole('blog'), null));
                }
                if (!(article.cathegory=="blog") && !(myUser.hasRole("content") || myUser.hasRole("admin"))) {
                    return next(new HttpException(403, messages.authTokenInvalidRole('content'), null));
                }            
                    //TODO::Update here image if required
                    article.public = req.body.article.public;
                    article.backgroundImage = req.body.article.backgroundImage;
                    article.image = req.body.article.image;
                    //We don't allow cathegory update as it would be able to change to wrong cathegory
                    await article.save();
                    for (let translation of article.translations) {
                        let data : ArticleTranslation = req.body.article.translations.find( (obj:ArticleTranslation) => obj.iso ==  translation.iso);
                        if (data) {
                            if (data.content)
                                translation.content = data.content;
                            if (data.title)
                                translation.title = data.title;
                            if (data.description)
                                translation.description = data.description;                                                                
                            await translation.save();
                        }
                    }
                    res.json(await Article.findByPk(req.body.article.id));
                }*/
        } catch(error) {
            next(error);
        }
    }
    /**Parameter validation */
    static updateChecks() {
        return [
            body('email').exists().withMessage('exists'),
            body('email.id').exists().withMessage('exists').custom(CustomValidators.dBExists(Email,'id')),
            body('email.translations').exists().withMessage('exists'),
            //TODO: Add here all required checks !!!

            Middleware.validate()
        ]
    }    

    /**Email testing for now */
    static emailSend = async (req: Request, res: Response, next:NextFunction) => {
        //TODO: Get post parameter of template email, additionalHTML
        try {
            let myUser = await User.scope("withRoles").findByPk(req.user.id);
            if (!myUser) return next(new HttpException(500, messages.validationDBMissing('user'),null))
            let myEmail = await Email.findOne({where:{name:"validate-email"}});
            if (!myEmail) return next(new HttpException(500, messages.emailSentError,null));
            let html = await myEmail.getHtml(res.locals.language, '<p>Validate your email by clicking to the following <a href="/test">link</a></p>');
            if (!html)  return next(new HttpException(500, messages.emailSentError,null));
            const transporter = nodemailer.createTransport(AppConfig.emailSmtp);
            let myEmailT = {
                            from: AppConfig.emailSmtp.sender,
                            to: myUser.email,
                            subject: messages.authEmailValidateSubject(AppConfig.api.appName),
                            text: htmlToText.fromString(html),
                            html: html
            }
            console.log("text:");
            console.log(htmlToText.fromString(html));
            await transporter.sendMail(myEmailT);
            res.send({message: {show:true, text:messages.emailSentOk(myUser.email)}});  
        } catch (error) {
            next(new HttpException(500, messages.emailSentError,null));

        }


        //Generate email html
 /*       try {
            let myHeader = await Article.getEmailPart("header", res.locals.language);
            let myFooter = await Article.getEmailPart("footer", res.locals.language);
            let myUser = await User.scope("withRoles").findByPk(req.user.id);
            if (!myUser) return next(new HttpException(500, messages.validationDBMissing('user'),null))
            const link = AppConfig.api.host + ":"+ AppConfig.api.port + "/test";
            let html = pug.renderFile(path.join(__dirname, "../emails/validation."+ res.locals.language + ".pug"), {title:AppConfig.api.appName,header: myHeader,footer:myFooter,validationLink: link});
            //CSS must be put inline for better support of all browsers
            html =  await InlineCss(html, {extraCss:"",applyStyleTags:true,applyLinkTags:true,removeStyleTags:true,removeLinkTags:true,url:"filePath"});
            const transporter = nodemailer.createTransport(AppConfig.emailSmtp);
            let myEmail = {
                            from: AppConfig.emailSmtp.sender,
                            to: myUser.email,
                            subject: messages.authEmailValidateSubject(AppConfig.api.appName),
                            text: htmlToText.fromString(html),
                            html: html
            }
            console.log(html);
            console.log("text:");
            console.log(htmlToText.fromString(html));
            await transporter.sendMail(myEmail);
            res.send({message: {show:true, text:messages.authEmailValidate(myUser.email)}});  

        } catch (error) {
            next(new HttpException(500, messages.authEmailSentError,null));

        }*/
    }
    static emailShow = async (req: Request, res: Response, next:NextFunction) => {
        //Generate email html
        try {
            let myEmail = await Email.findOne({where:{name:"validate-email"}});
            if (!myEmail) return next(new HttpException(500, messages.emailSentError,null));
            let html = await myEmail.getHtml(res.locals.language, '<p>Validate your email by clicking to the following <a href="/test">link</a></p>');
            console.log(html);
            res.send(html);
        } catch (error) {
            next(new HttpException(500, messages.emailSentError,null));

        }
    }
}