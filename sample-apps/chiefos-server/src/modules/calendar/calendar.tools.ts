import {
  ToolDecorator as Tool,
  Injectable,
  ExecutionContext,
  z
} from "@nitrostack/core";

@Injectable()
export class CalendarTools {

  @Tool({
    name: "calendar_check_availability",
    description: "Check calendar availability",
    inputSchema: z.object({
      date: z.string()
    })
  })
  async checkAvailability(
    input:{date:string},
    context:ExecutionContext
  ){

    context.logger.info("Checking availability",input);

    return{
      available:true,
      freeSlots:[
        "09:00-10:00",
        "02:00-04:00"
      ]
    };

  }

}