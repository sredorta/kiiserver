import {ValidationError} from 'class-validator';
import {ValidationErrorItem} from 'sequelize';

import { messages } from '../middleware/common';
export class HttpException extends Error {
    status: number;
    message: string;
    type : "validation"|"sequelize"|"custom";
    errors : any = null;
    constructor(status:number, type:"validation"|"sequelize"|"custom", message:string, errors:any[] | null) {
      super(message);
      this.status = status;
      this.type = type;
      this.message = message;   //Default message
      this.errors = errors;     //Errors in case of validation for example
      
      console.log(this);

//      this.patchMessage();
    }

    private patchMessage() {
      if (this.type != "custom")
      if (this.errors) {
        if (this.errors[0]) {
          switch (this.type) {
            case "validation": 
              this.transformValidationMessage();
              break;
            case "sequelize":
              this.transformSequelizeMessage();  
            default:
              //Do nothing and keep message
          }
        }
      }
    }

    private transformValidationMessage() {
      let myError : ValidationError = this.errors[0];
      this.message = messages.validation(myError.property);
    }

    private transformSequelizeMessage() {
      let myError :ValidationErrorItem =  this.errors[0];
      console.log(myError);
      switch (myError.type) {
        case "Validation error": {
          
          this.message = messages.validationParamsSequelize(myError.path);
          break;
        }
        case "unique violation": {
          this.message = messages.validationUniqueSequelize;
          break;
        }
        case "notNull Violation": {
          this.message = messages.validationNotNullSequelize(myError.path);
          break;
        }
        default:
      }
    }
}
   
//export default HttpException;