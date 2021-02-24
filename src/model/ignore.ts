import {META_IGNORE_ME} from "../constants";

export  function ignore(model:{}){
  if(typeof model ==='object'){
    model[META_IGNORE_ME] = true
  }
}