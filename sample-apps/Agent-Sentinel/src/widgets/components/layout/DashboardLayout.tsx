'use client';

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function DashboardLayout({

  children,

}:{

  children: React.ReactNode;

}){

  return(

    <div
      style={{
        display:"flex",
        background:"#030712",
      }}
    >

      <Sidebar/>

      <div
        style={{
          flex:1,
        }}
      >

        <Topbar/>

        <div
          style={{
            padding:30,
          }}
        >

          {children}

        </div>

      </div>

    </div>

  );

}