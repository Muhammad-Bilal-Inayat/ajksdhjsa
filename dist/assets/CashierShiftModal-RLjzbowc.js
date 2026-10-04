var Y=Object.defineProperty,q=Object.defineProperties;var K=Object.getOwnPropertyDescriptors;var H=Object.getOwnPropertySymbols;var X=Object.prototype.hasOwnProperty,J=Object.prototype.propertyIsEnumerable;var G=(t,n,s)=>n in t?Y(t,n,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[n]=s,M=(t,n)=>{for(var s in n||(n={}))X.call(n,s)&&G(t,s,n[s]);if(H)for(var s of H(n))J.call(n,s)&&G(t,s,n[s]);return t},P=(t,n)=>q(t,K(n));import{j as e,Z as Q,G as r}from"./app.js";import{r as x}from"./vendor-react-DCeHAtwK.js";import{D as ee,i as _,X as te,aw as se,c7 as ae,C as ne,V as I,ad as le}from"./vendor-icons-D-CU2ADz.js";function z(t){return t?(t.n5000||0)*5e3+(t.n1000||0)*1e3+(t.n500||0)*500+(t.n100||0)*100+(t.n50||0)*50+(t.n20||0)*20+(t.n10||0)*10+(t.coins||0):0}function de(t,n,s=[],v=[]){const m=new Date(t.startTime).getTime(),b=t.endTime?new Date(t.endTime).getTime():Date.now(),u=n.filter(a=>{const i=new Date(a.date||a.createdAt||0).getTime();return i>=m&&i<=b});let p=0,g=0,j=0,T=0,w=0;u.forEach(a=>{const i=a.transactionType==="Sale Return",c=a.receivedAmount!==void 0?a.receivedAmount:a.grandTotal||0;if(i){(a.paymentType==="Cash"||a.paymentMethod==="Cash")&&(w+=c);return}const o=String(a.paymentType||a.paymentMethod||"Cash");o==="Cash"?p+=c:o==="Card"||o.includes("Card")?g+=c:o==="Bank Transfer"||o==="Online"||o==="UPI"||o==="Bank"?j+=c:o==="Credit"||o.includes("Credit")?(T+=a.balanceDue||a.grandTotal||0,a.receivedAmount&&a.receivedAmount>0&&(p+=a.receivedAmount)):p+=c});const O=p+g+j+T,N=s.filter(a=>{const i=new Date(a.date||a.createdAt||0).getTime();return(!a.paymentType||a.paymentType==="Cash")&&i>=m&&i<=b}),y=N.reduce((a,i)=>a+(i.paidAmount||i.amount||0),0),k=v.filter(a=>{const i=new Date(a.date||a.createdAt||0).getTime();return a.paymentMode==="Cash"&&a.type==="PAYMENT_IN"&&i>=m&&i<=b}),D=k.reduce((a,i)=>a+(i.amount||0),0),S=t.cashDropsTotal||0,E=t.openingCash||0,R=E+p+D-w-y-S,A=t.actualCash!==void 0?t.actualCash:R,h=A-R;let $="BALANCED";return h>.5?$="OVERAGE":h<-.5&&($="SHORTAGE"),{shiftId:t.id,cashierName:t.cashierName,startTime:t.startTime,endTime:t.endTime,openingCash:E,cashSales:p,cardSales:g,bankSales:j,creditSales:T,totalSales:O,invoicesCount:u.length,cashIn:D,cashOut:w,expensesTotal:y,cashDropsTotal:S,expectedCash:R,actualCash:A,variance:h,varianceStatus:$,shiftInvoices:u,shiftExpenses:N,shiftPartyPayments:k}}function ie(t,n,s){const v=window.open("","_blank","width=450,height=750");if(!v)return;const m=new Date().toLocaleString("en-PK",{dateStyle:"medium",timeStyle:"short"}),b=new Date(t.startTime).toLocaleString("en-PK",{dateStyle:"short",timeStyle:"short"}),u=t.endTime?new Date(t.endTime).toLocaleString("en-PK",{dateStyle:"short",timeStyle:"short"}):"Still Active",p=`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Z-Report Shift Reconciliation #${n.shiftNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            line-height: 1.35;
            padding: 4px;
            max-width: 78mm;
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .flex { display: flex; justify-content: space-between; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            font-weight: bold;
            border: 1px solid #000;
            border-radius: 3px;
          }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          th, td { padding: 2px 0; font-size: 11px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="font-bold text-lg">${(s==null?void 0:s.name)||"MBI INVENTRA PHARMACY"}</div>
          <div>${(s==null?void 0:s.address)||"Main Commercial Market"}</div>
          <div>Tel: ${(s==null?void 0:s.phone)||"+92 300 1234567"}</div>
          ${s!=null&&s.taxNumber?`<div>NTN/GST: ${s.taxNumber}</div>`:""}
          ${s!=null&&s.drugLicenseNo?`<div>D.L. #: ${s.drugLicenseNo}</div>`:""}
          <div class="divider"></div>
          <div class="font-bold text-lg">*** END OF SHIFT Z-REPORT ***</div>
          <div>DRAWER CASH RECONCILIATION</div>
        </div>

        <div class="divider"></div>

        <div class="flex">
          <span>Shift Ref:</span>
          <span class="font-bold">#${n.shiftNumber} (${n.shiftType||"General"})</span>
        </div>
        <div class="flex">
          <span>Cashier:</span>
          <span class="font-bold">${n.cashierName}</span>
        </div>
        <div class="flex">
          <span>Shift Start:</span>
          <span>${b}</span>
        </div>
        <div class="flex">
          <span>Shift End:</span>
          <span>${u}</span>
        </div>
        <div class="flex">
          <span>Printed At:</span>
          <span>${m}</span>
        </div>

        <div class="divider"></div>
        <div class="font-bold text-center">--- SALES SUMMARY ---</div>

        <div class="flex">
          <span>Cash Sales (${t.shiftInvoices.filter(g=>(g.paymentType||g.paymentMethod)==="Cash").length} bills):</span>
          <span class="font-bold">Rs. ${t.cashSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Card / Digital Sales:</span>
          <span>Rs. ${t.cardSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Bank Transfer / UPI:</span>
          <span>Rs. ${t.bankSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>Credit / Due Sales:</span>
          <span>Rs. ${t.creditSales.toFixed(2)}</span>
        </div>
        <div class="flex font-bold" style="border-top: 1px dotted #000; margin-top: 2px; padding-top: 2px;">
          <span>GROSS SALES (${t.invoicesCount} Invoices):</span>
          <span>Rs. ${t.totalSales.toFixed(2)}</span>
        </div>

        <div class="divider"></div>
        <div class="font-bold text-center">--- CASH DRAWER AUDIT ---</div>

        <div class="flex">
          <span>(+) Opening Float:</span>
          <span>Rs. ${t.openingCash.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(+) Cash Sales:</span>
          <span>Rs. ${t.cashSales.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(+) Customer Recoveries (In):</span>
          <span>Rs. ${t.cashIn.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(-) Cash Refunds/Returns:</span>
          <span>Rs. ${t.cashOut.toFixed(2)}</span>
        </div>
        <div class="flex">
          <span>(-) Shift Cash Expenses:</span>
          <span>Rs. ${t.expensesTotal.toFixed(2)}</span>
        </div>
        ${t.cashDropsTotal>0?`
          <div class="flex">
            <span>(-) Safe Drops / Transfer:</span>
            <span>Rs. ${t.cashDropsTotal.toFixed(2)}</span>
          </div>
        `:""}

        <div class="divider"></div>

        <div class="flex font-bold text-lg">
          <span>EXPECTED CASH:</span>
          <span>Rs. ${t.expectedCash.toFixed(2)}</span>
        </div>
        <div class="flex font-bold text-lg">
          <span>ACTUAL COUNTED CASH:</span>
          <span>Rs. ${t.actualCash.toFixed(2)}</span>
        </div>

        <div class="double-divider"></div>

        <div class="flex font-bold text-lg" style="padding: 3px 0;">
          <span>CASH VARIANCE:</span>
          <span>${t.variance>0?"+":""}Rs. ${t.variance.toFixed(2)}</span>
        </div>
        <div class="text-center font-bold" style="margin-top: 2px;">
          STATUS: [ ${t.varianceStatus} ]
        </div>

        ${n.differenceReason?`
          <div style="margin-top: 6px; padding: 4px; border: 1px dashed #000;">
            <strong>Discrepancy Note:</strong> ${n.differenceReason}
          </div>
        `:""}

        ${n.denominations?`
          <div class="divider"></div>
          <div class="font-bold text-center">--- PHYSICAL NOTE COUNT ---</div>
          <table>
            <tr><td>5000 x ${n.denominations.n5000||0}</td><td class="text-right">Rs. ${((n.denominations.n5000||0)*5e3).toFixed(0)}</td></tr>
            <tr><td>1000 x ${n.denominations.n1000||0}</td><td class="text-right">Rs. ${((n.denominations.n1000||0)*1e3).toFixed(0)}</td></tr>
            <tr><td>500 x ${n.denominations.n500||0}</td><td class="text-right">Rs. ${((n.denominations.n500||0)*500).toFixed(0)}</td></tr>
            <tr><td>100 x ${n.denominations.n100||0}</td><td class="text-right">Rs. ${((n.denominations.n100||0)*100).toFixed(0)}</td></tr>
            <tr><td>50 x ${n.denominations.n50||0}</td><td class="text-right">Rs. ${((n.denominations.n50||0)*50).toFixed(0)}</td></tr>
            <tr><td>20 x ${n.denominations.n20||0}</td><td class="text-right">Rs. ${((n.denominations.n20||0)*20).toFixed(0)}</td></tr>
            <tr><td>10 x ${n.denominations.n10||0}</td><td class="text-right">Rs. ${((n.denominations.n10||0)*10).toFixed(0)}</td></tr>
            <tr><td>Coins</td><td class="text-right">Rs. ${(n.denominations.coins||0).toFixed(0)}</td></tr>
          </table>
        `:""}

        <div class="double-divider"></div>

        <div style="margin-top: 25px;">
          <div class="flex">
            <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px;">
              Cashier Signature
            </div>
            <div style="width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 3px;">
              Manager / Auditor
            </div>
          </div>
        </div>

        <div class="text-center" style="margin-top: 14px; font-size: 9px;">
          Powered by MBI Inventra POS & ERP
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `;v.document.write(p),v.document.close()}const he=({isOpen:t,onClose:n,currentShift:s,cashierName:v,invoicesToday:m,expensesToday:b=[],partyPaymentsToday:u=[],onOpenShift:p,onCloseShift:g})=>{if(!t)return null;const[j,T]=x.useState(5e3),[w,O]=x.useState("Morning"),[N,y]=x.useState(0),[k,D]=x.useState(""),[S,E]=x.useState(""),[R,A]=x.useState(""),[h,$]=x.useState(!0),[a,i]=x.useState({n5000:0,n1000:0,n500:0,n100:0,n50:0,n20:0,n10:0,coins:0}),[c,o]=x.useState(s&&s.status==="OPEN"?"VIEW":"OPEN_FORM"),d=x.useMemo(()=>s?de(s,m,b,u):null,[s,m,b,u]),F=x.useMemo(()=>z(a),[a]),f=(l,V)=>{const B=P(M({},a),{[l]:Math.max(0,V)});i(B),y(z(B))},W=l=>{l.preventDefault(),p(j,S,w),o("VIEW")},Z=l=>{l.preventDefault(),g(h?F:N,k,S,a,R),n()},L=()=>{if(!s||!d)return;const l=JSON.parse(localStorage.getItem("mock_business")||"{}");ie(P(M({},d),{actualCash:N||d.expectedCash}),s,l)},U=d?d.expectedCash:j,C=(h?F:N)-U;return e.jsx("div",{className:"fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn",children:e.jsxs("div",{className:"bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col border border-slate-200",children:[e.jsxs("div",{className:"bg-slate-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"p-2 bg-blue-500/20 rounded-xl text-blue-400",children:e.jsx(ee,{className:"w-5 h-5"})}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-base font-bold text-white tracking-wide",children:"Cashier Shift & Cash Drawer Reconciliation"}),e.jsxs("p",{className:"text-xs text-slate-300",children:["Cashier: ",e.jsx("strong",{className:"text-amber-300",children:v}),(s==null?void 0:s.shiftType)&&e.jsxs("span",{className:"ml-2 px-2 py-0.5 bg-slate-800 rounded text-[10px] text-blue-300",children:[s.shiftType," Shift"]})]})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[s&&s.status==="OPEN"&&e.jsxs("button",{type:"button",onClick:L,className:"p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition",title:"Print Shift Slip",children:[e.jsx(_,{className:"w-4 h-4"}),e.jsx("span",{className:"hidden sm:inline",children:"Slip"})]}),e.jsx("button",{onClick:n,className:"p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition",children:e.jsx(te,{className:"w-5 h-5"})})]})]}),e.jsxs("div",{className:"p-6 overflow-y-auto space-y-5 text-slate-800 text-xs max-h-[80vh]",children:[s&&s.status==="OPEN"?e.jsxs("div",{className:"bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2 text-emerald-900",children:[e.jsx("span",{className:"w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"}),e.jsxs("span",{className:"font-bold text-sm",children:["Shift ACTIVE (#",s.shiftNumber,")"]})]}),e.jsxs("span",{className:"text-[11px] text-slate-600 font-medium",children:["Started: ",Q(s.startTime)]})]}):e.jsxs("div",{className:"bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2 text-amber-900 font-bold",children:[e.jsx(se,{className:"w-4 h-4 text-amber-600"}),"No Active Shift Open for this Terminal"]}),e.jsx("button",{onClick:()=>o("OPEN_FORM"),className:"px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm",children:"Open New Shift"})]}),c==="OPEN_FORM"&&e.jsxs("form",{onSubmit:W,className:"space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200",children:[e.jsxs("h3",{className:"font-bold text-slate-900 text-sm flex items-center gap-2",children:[e.jsx(ae,{className:"w-4 h-4 text-blue-600"}),"Open Cash Drawer Shift"]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"font-semibold text-slate-700 block mb-1",children:"Shift Type"}),e.jsxs("select",{value:w,onChange:l=>O(l.target.value),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none",children:[e.jsx("option",{value:"Morning",children:"Morning Shift"}),e.jsx("option",{value:"Evening",children:"Evening Shift"}),e.jsx("option",{value:"Night",children:"Night Shift"}),e.jsx("option",{value:"General",children:"General Full Day"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"font-semibold text-slate-700 block mb-1",children:"Opening Cash Float in Drawer (Rs.)"}),e.jsx("input",{type:"number",min:"0",step:"1",required:!0,value:j,onChange:l=>T(Number(l.target.value)),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"font-semibold text-slate-700 block mb-1",children:"Shift Notes / Float Details"}),e.jsx("input",{type:"text",placeholder:"e.g. Morning counter shift with Rs. 5000 small change float",value:S,onChange:l=>E(l.target.value),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"})]}),e.jsxs("button",{type:"submit",className:"w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2",children:[e.jsx(ne,{className:"w-4 h-4"})," Confirm & Start Shift"]})]}),c==="VIEW"&&s&&d&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-2.5",children:[e.jsxs("div",{className:"bg-slate-50 border border-slate-200 p-3 rounded-xl",children:[e.jsx("span",{className:"text-[10px] font-bold text-slate-500 block uppercase",children:"Opening Float"}),e.jsx("span",{className:"text-sm font-black text-slate-900",children:r(d.openingCash)})]}),e.jsxs("div",{className:"bg-emerald-50 border border-emerald-200 p-3 rounded-xl",children:[e.jsx("span",{className:"text-[10px] font-bold text-emerald-700 block uppercase",children:"Cash Sales"}),e.jsxs("span",{className:"text-sm font-black text-emerald-950",children:["+",r(d.cashSales)]})]}),e.jsxs("div",{className:"bg-blue-50 border border-blue-200 p-3 rounded-xl",children:[e.jsx("span",{className:"text-[10px] font-bold text-blue-700 block uppercase",children:"Digital / Card"}),e.jsx("span",{className:"text-sm font-black text-blue-950",children:r(d.cardSales+d.bankSales)})]}),e.jsxs("div",{className:"bg-rose-50 border border-rose-200 p-3 rounded-xl",children:[e.jsx("span",{className:"text-[10px] font-bold text-rose-700 block uppercase",children:"Shift Expenses"}),e.jsxs("span",{className:"text-sm font-black text-rose-950",children:["-",r(d.expensesTotal)]})]})]}),e.jsxs("div",{className:"bg-slate-900 text-white p-4 rounded-xl space-y-2",children:[e.jsxs("div",{className:"flex justify-between text-xs text-slate-300",children:[e.jsx("span",{children:"(+) Opening Float:"}),e.jsx("span",{children:r(d.openingCash)})]}),e.jsxs("div",{className:"flex justify-between text-xs text-slate-300",children:[e.jsxs("span",{children:["(+) Cash Sales (",d.shiftInvoices.filter(l=>(l.paymentType||l.paymentMethod)==="Cash").length," bills):"]}),e.jsxs("span",{children:["+",r(d.cashSales)]})]}),d.cashIn>0&&e.jsxs("div",{className:"flex justify-between text-xs text-emerald-400",children:[e.jsx("span",{children:"(+) Customer Recoveries / Cash In:"}),e.jsxs("span",{children:["+",r(d.cashIn)]})]}),d.cashOut>0&&e.jsxs("div",{className:"flex justify-between text-xs text-amber-300",children:[e.jsx("span",{children:"(-) Cash Sales Returns / Refunds:"}),e.jsxs("span",{children:["-",r(d.cashOut)]})]}),d.expensesTotal>0&&e.jsxs("div",{className:"flex justify-between text-xs text-rose-300",children:[e.jsx("span",{children:"(-) Cash Expenses Paid from Drawer:"}),e.jsxs("span",{children:["-",r(d.expensesTotal)]})]}),e.jsxs("div",{className:"border-t border-slate-700 pt-2 flex justify-between text-sm font-bold text-amber-300",children:[e.jsx("span",{children:"Expected Drawer Cash Balance:"}),e.jsx("span",{className:"text-base font-black",children:r(d.expectedCash)})]})]}),e.jsxs("div",{className:"flex justify-between items-center gap-2 pt-1",children:[e.jsxs("button",{type:"button",onClick:L,className:"px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition",children:[e.jsx(_,{className:"w-4 h-4"})," Print Z-Slip"]}),e.jsxs("button",{type:"button",onClick:()=>{y(d.expectedCash),o("CLOSE_FORM")},className:"px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition",children:[e.jsx(I,{className:"w-4 h-4"})," End Shift & Reconcile"]})]})]}),c==="CLOSE_FORM"&&e.jsxs("form",{onSubmit:Z,className:"space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-slate-200 pb-2",children:[e.jsxs("h3",{className:"font-bold text-slate-900 text-sm flex items-center gap-1.5",children:[e.jsx(I,{className:"w-4 h-4 text-rose-600"}),"Close Shift & Reconcile Drawer Cash"]}),e.jsxs("button",{type:"button",onClick:()=>$(!h),className:"text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1",children:[e.jsx(le,{className:"w-3.5 h-3.5"}),h?"Switch to Simple Amount":"Use Note Denomination Counter"]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 text-xs",children:[e.jsxs("div",{className:"bg-white p-3 rounded-lg border border-slate-200",children:[e.jsx("span",{className:"text-slate-500 font-semibold block",children:"Expected in Drawer:"}),e.jsx("span",{className:"text-base font-black text-slate-900",children:r(U)})]}),e.jsxs("div",{className:"bg-white p-3 rounded-lg border border-slate-200",children:[e.jsx("span",{className:"text-slate-500 font-semibold block",children:"Cash Discrepancy / Variance:"}),e.jsx("span",{className:`text-base font-black ${C<-.5?"text-rose-600":C>.5?"text-emerald-600":"text-slate-900"}`,children:C>0?`+${r(C)} (Overage)`:C<0?`${r(C)} (Shortage)`:"Exact (Balanced)"})]})]}),h?e.jsxs("div",{className:"space-y-2 bg-white p-3 rounded-lg border border-slate-200",children:[e.jsxs("div",{className:"flex justify-between items-center text-[11px] font-bold text-slate-700 mb-1",children:[e.jsx("span",{children:"Pakistani Currency Denominations"}),e.jsxs("span",{className:"text-blue-600 font-black",children:["Sum: ",r(F)]})]}),e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 5,000"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n5000||"",onChange:l=>f("n5000",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 1,000"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n1000||"",onChange:l=>f("n1000",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 500"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n500||"",onChange:l=>f("n500",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 100"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n100||"",onChange:l=>f("n100",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 50"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n50||"",onChange:l=>f("n50",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 20"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n20||"",onChange:l=>f("n20",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Rs. 10"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.n10||"",onChange:l=>f("n10",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"text-[10px] text-slate-500 font-bold block",children:"Coins / Change"}),e.jsx("input",{type:"number",min:"0",placeholder:"0",value:a.coins||"",onChange:l=>f("coins",parseInt(l.target.value)||0),className:"w-full px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold"})]})]})]}):e.jsxs("div",{children:[e.jsx("label",{className:"font-semibold text-slate-700 block mb-1",children:"Physical Cash Counted in Drawer (Rs.)"}),e.jsx("input",{type:"number",min:"0",step:"1",required:!0,value:N,onChange:l=>y(Number(l.target.value)),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"})]}),Math.abs(C)>.5&&e.jsxs("div",{children:[e.jsx("label",{className:"font-bold text-rose-700 block mb-1",children:"Variance Reason / Explanation (Required when difference exists)"}),e.jsx("input",{type:"text",required:!0,placeholder:"e.g. Minor coin shortage, Unrecorded tea petty cash payout",value:k,onChange:l=>D(l.target.value),className:"w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"font-semibold text-slate-700 block mb-1",children:"Supervisor / Auditor Sign-off (Optional)"}),e.jsx("input",{type:"text",placeholder:"Manager / Supervisor Name",value:R,onChange:l=>A(l.target.value),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"})]}),e.jsxs("div",{className:"flex items-center gap-2 pt-2",children:[e.jsx("button",{type:"button",onClick:()=>o("VIEW"),className:"px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs",children:"Cancel"}),e.jsxs("button",{type:"submit",className:"flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-1.5",children:[e.jsx(I,{className:"w-4 h-4"})," Confirm & Finalize Shift Close"]})]})]})]}),e.jsxs("div",{className:"bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between",children:[e.jsx("span",{className:"text-[11px] text-slate-500",children:"All shift reconciliation events are logged to audit trail."}),e.jsx("button",{onClick:n,className:"px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm",children:"Close"})]})]})})};export{he as C,de as c,ie as p,z as s};
