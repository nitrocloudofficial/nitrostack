import { useState } from "react";

export default function Search() {

    const [query,setQuery]=useState("");

    return(

        <div className="page">

            <h1>Search Students</h1>

            <input
            className="search-input"
            placeholder="Search Skills"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            />

            <div className="search-result">

                No Results Yet

            </div>

        </div>

    )

}