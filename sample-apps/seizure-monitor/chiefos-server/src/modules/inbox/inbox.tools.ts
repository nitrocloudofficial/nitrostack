import {
 ToolDecorator as Tool,
 Injectable,
 ExecutionContext,
 z
} from "@nitrostack/core";

@Injectable()
export class InboxTools{

 @Tool({
   name:"get_inbox_summary",
   description:"Returns inbox summary",
   inputSchema:z.object({})
 })

 async summary(
   input:{},
   context:ExecutionContext
 ){

   return{
      total:25,
      unread:4,
      urgent:1
   };

 }

}