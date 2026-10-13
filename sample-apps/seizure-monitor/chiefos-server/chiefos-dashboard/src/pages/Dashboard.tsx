import { motion } from "framer-motion";
import {
  Mail,
  CalendarDays,
  CheckSquare,
  AlertTriangle,
  Bot,
  ClipboardCheck
} from "lucide-react";

import StatCard from "../component/StatCard";
import Charts from "../component/Charts";
import AIAssistant from "../component/AIAssistant";
import ActivityFeed from "../component/ActivityFeed";


const stats = [
  {
    title: "Emails",
    value: "128",
    icon: Mail
  },
  {
    title: "Meetings",
    value: "24",
    icon: CalendarDays
  },
  {
    title: "Tasks",
    value: "54",
    icon: CheckSquare
  },
  {
    title: "Approvals",
    value: "6",
    icon: ClipboardCheck
  },
  {
    title: "Critical",
    value: "2",
    icon: AlertTriangle
  },
  {
    title: "AI Agents",
    value: "8 Online",
    icon: Bot
  }
];


const tools = [
  "Chief AI",
  "Inbox Agent",
  "Email Triage",
  "Calendar Agent",
  "Meeting Scheduler",
  "Task Manager",
  "Audit Workflow",
  "Approval Workflow"
];


function Dashboard() {

  return (

    <div className="space-y-8">


      {/* Header */}

      <div>

        <h1 className="
          text-3xl
          font-bold
          text-white
        ">
          Dashboard
        </h1>


        <p className="text-slate-400">
          Your AI command center overview
        </p>

      </div>



      {/* Stats */}

      <div className="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-5
      ">

        {
          stats.map((item,index)=>(

            <motion.div

              key={item.title}

              initial={{
                opacity:0,
                y:20
              }}

              animate={{
                opacity:1,
                y:0
              }}

              transition={{
                delay:index*0.1
              }}

            >

              <StatCard
                title={item.title}
                value={item.value}
                icon={item.icon}
              />


            </motion.div>

          ))
        }


      </div>




      {/* Charts */}

      <Charts />




      {/* Activity */}

      <ActivityFeed />




      {/* AI Assistant */}

      <AIAssistant />




      {/* Tool Status */}

      <div className="
        bg-slate-900
        border
        border-slate-800
        rounded-2xl
        p-6
      ">


        <h2 className="
          text-xl
          font-semibold
          mb-4
        ">
          Tool Status
        </h2>



        <div className="
          grid
          grid-cols-2
          md:grid-cols-4
          gap-4
        ">


          {
            tools.map(tool=>(

              <div
                key={tool}
                className="
                  bg-slate-800
                  p-4
                  rounded-xl
                "
              >

                <span className="text-green-400">
                  ●
                </span>

                {" "}

                {tool}


              </div>

            ))
          }


        </div>


      </div>


    </div>

  );

}


export default Dashboard;