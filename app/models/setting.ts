import app from "../app";
import { Sequelize, Model, DataTypes } from 'sequelize';
import AppConfig from '../config/config.json';

export class Setting extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.

    public key!: string;
    public value!:string;
  
    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;


    public static data : any[] = [];

    //Does the model definition for SQL
    public static definition(sequelize : Sequelize) {
        return { params :{
               id: {
                type: new DataTypes.INTEGER().UNSIGNED,
                autoIncrement: true,
                primaryKey: true,
                },
               key: {
                type: new DataTypes.STRING(50),
                allowNull: false,
                unique: true
                },
               value: {
                    type: new DataTypes.STRING(50),
                    allowNull: false,
                    defaultValue: ""
                }
            }, table: {
                tableName: 'settings',
                modelName: 'setting',
                sequelize: sequelize
            }};
        }

    //Seeds the table with all the defaults copies the data from the config.json to the settings table for the front-end
    //import AppConfig from '../config/config.json';

    public static seed() {
        async function _seed() {
            for(let item of AppConfig.sharedSettings) {
                await Setting.create({
                    key: item.key,
                    value: item.value
                });                
            }
            console.log("SEED END");
        }
        return _seed();
    }

}




        