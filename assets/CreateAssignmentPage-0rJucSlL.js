const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./HandwritingPreview-BXzm74kN.js","./vendor-react-DhjAJOz0.js","./vendor-other-D5D0PSxi.js","./sanitize-Dk79Hu0L.js","./index-BZre-rX_.js","./vendor-utils-CHvWzBCl.js","./index-tWb3gvZ2.css","./Input-gAoNRmrC.js","./Badge--nOnJLIx.js","./Tabs-ClXhprKN.js","./Modal-4SkvtqCl.js","./RealisticHandwritingSettings-CQtfCnrz.js"])))=>i.map(i=>d[i]);
import{a as Cs,C as J,b as V,c as X,B as N,d as q,i as ns,j as Ps,h as M,e as rs,k as me,l as As,_ as Is}from"./index-BZre-rX_.js";import{r as c,j as e,c as ge,a1 as Le,a5 as zs,I as Oe,a6 as gs,a7 as Ds,a8 as $e,a9 as re,h as ve,F as Z,D as Qe,_ as Te,X as is,aa as Fs,Q as Ms,ab as Es,E as ye,Y as De,g as Ge,ac as ls,a0 as Rs,ad as Ls,ae as Ts,p as Gs,$ as h,y as os,P as Os,af as $s,ag as Fe,z as Me,ah as Qs,f as cs}from"./vendor-react-DhjAJOz0.js";import{I as ds,S as ie,T as hs}from"./Input-gAoNRmrC.js";import{B as Hs}from"./Badge--nOnJLIx.js";import{a as Se}from"./Tabs-ClXhprKN.js";import{M as _s}from"./Modal-4SkvtqCl.js";import{H as Us,M as Bs,R as Js}from"./RealisticHandwritingSettings-CQtfCnrz.js";const xa={A4:{width:794,height:1123,marginTop:80,marginRight:60,marginBottom:80,marginLeft:60},A5:{width:559,height:794,marginTop:60,marginRight:40,marginBottom:60,marginLeft:40},Letter:{width:816,height:1056,marginTop:80,marginRight:60,marginBottom:80,marginLeft:60},Legal:{width:816,height:1344,marginTop:80,marginRight:60,marginBottom:80,marginLeft:60},Custom:{width:794,height:1123,marginTop:80,marginRight:60,marginBottom:80,marginLeft:60}},Vs=[{id:"mathematics",name:"Mathematics",icon:"calculator",color:"#3b82f6"},{id:"physics",name:"Physics",icon:"atom",color:"#ef4444"},{id:"chemistry",name:"Chemistry",icon:"flask-conical",color:"#22c55e"},{id:"biology",name:"Biology",icon:"dna",color:"#8b5cf6"},{id:"computer-science",name:"Computer Science",icon:"cpu",color:"#f59e0b"},{id:"english",name:"English",icon:"book-open",color:"#ec4899"},{id:"history",name:"History",icon:"landmark",color:"#6b7280"},{id:"geography",name:"Geography",icon:"globe",color:"#06b6d4"},{id:"economics",name:"Economics",icon:"trending-up",color:"#84cc16"},{id:"environmental-studies",name:"Environmental Studies",icon:"leaf",color:"#10b981"},{id:"other",name:"Other",icon:"folder",color:"#9ca3af"}],Xs=[{value:"small",label:"Small",description:"Compact handwriting"},{value:"medium",label:"Medium",description:"Standard handwriting"},{value:"large",label:"Large",description:"Large, readable handwriting"}],qs=[{value:"continuous",label:"Continuous",description:"Questions flow naturally"},{value:"new-line",label:"New Line",description:"Each question on new line"},{value:"new-page",label:"New Page",description:"Each question starts on new page"}],Ys=[{value:"ruled",label:"Ruled",description:"Traditional lined paper"},{value:"plain",label:"Plain",description:"Clean white paper"},{value:"grid",label:"Grid",description:"Graph paper style"}],Ws=[{value:"A4",label:"A4",dimensions:"210 × 297 mm"},{value:"A5",label:"A5",dimensions:"148 × 210 mm"},{value:"Letter",label:"Letter",dimensions:"8.5 × 11 in"},{value:"Legal",label:"Legal",dimensions:"8.5 × 14 in"}],Ee={name:"New Settings",handwritingMode:"realistic",realisticStyle:"cursive",penColor:"blue",handwritingSize:"medium",lineSpacing:1,wordSpacing:1,characterSpacing:1,margins:{top:80,right:60,bottom:80,left:60},penThickness:1,questionStartMode:"continuous",showQuestionNumbers:!0,showPageNumbers:!0,paperStyle:"ruled",pageSize:"A4",isDefault:!1};function Ks({settings:u,activeSettings:m,isLoading:o,onCreate:R,onUpdate:_,onDelete:L,onSetActive:P,onDuplicate:y,className:i=""}){var U,T,ae,b,p;const[S,k]=c.useState(null),[d,A]=c.useState(Ee),[I,E]=c.useState(!1);c.useEffect(()=>{if(S){const a=u.find(f=>f.id===S);a&&A({...a})}else I&&A({...Ee,name:`Settings ${u.length+1}`})},[S,I,u]);const O=a=>{k(a.id),E(!1)},z=()=>{k("new"),E(!0)},$=()=>{k(null),E(!1),A(Ee)},ee=async()=>{try{I||S==="new"?(await R(d),re.success("Settings created")):S&&(await _(S,d),re.success("Settings updated")),$()}catch{re.error("Failed to save settings")}},se=async a=>{if(window.confirm("Are you sure you want to delete these settings?"))try{await L(a),re.success("Settings deleted")}catch{re.error("Failed to delete settings")}},le=async a=>{if(y)try{await y(a),re.success("Settings duplicated")}catch{re.error("Failed to duplicate settings")}},g=(a,f)=>{A(F=>({...F,[a]:f}))},D=(a,f,F)=>{A(C=>({...C,[a]:{...C[a]??{top:80,right:60,bottom:80,left:60},[f]:F}}))};return!S&&!I?e.jsxs("div",{className:`generation-settings-panel ${i}`,children:[e.jsxs("div",{className:"panel-header",children:[e.jsxs("h3",{children:[e.jsx(ge,{size:20}),"Generation Settings"]}),e.jsxs("button",{className:"btn-create",onClick:z,disabled:o,children:[e.jsx(Le,{size:18}),"Create New"]})]}),u.length===0?e.jsxs("div",{className:"empty-state",children:[e.jsx(ge,{size:48}),e.jsx("h4",{children:"No Generation Settings"}),e.jsx("p",{children:"Create your first generation settings to customize handwriting output"}),e.jsxs("button",{className:"btn-primary",onClick:z,children:[e.jsx(Le,{size:18}),"Create Settings"]})]}):e.jsx("div",{className:"settings-list",children:u.map(a=>e.jsx("div",{className:`settings-card ${(m==null?void 0:m.id)===a.id?"active":""}`,children:e.jsxs("div",{className:"settings-card-header",children:[e.jsxs("div",{className:"settings-info",children:[e.jsxs("div",{className:"settings-name-row",children:[e.jsx("h4",{children:a.name}),a.isDefault&&e.jsxs("span",{className:"default-badge",children:[e.jsx(zs,{size:14,fill:"currentColor"}),"Default"]}),(m==null?void 0:m.id)===a.id&&e.jsx("span",{className:"active-badge",children:"Active"})]}),a.description&&e.jsx("p",{className:"settings-description",children:a.description}),e.jsxs("div",{className:"settings-meta",children:[e.jsxs("span",{className:"meta-item",children:[e.jsx("span",{className:"meta-label",children:"Mode:"}),e.jsx("span",{className:"meta-value mode-{setting.handwritingMode}",children:a.handwritingMode})]}),a.handwritingMode==="realistic"&&e.jsxs(e.Fragment,{children:[e.jsxs("span",{className:"meta-item",children:[e.jsx("span",{className:"meta-label",children:"Style:"}),e.jsx("span",{className:"meta-value",children:a.realisticStyle})]}),e.jsxs("span",{className:"meta-item",children:[e.jsx("span",{className:"meta-label",children:"Ink:"}),e.jsx("span",{className:"meta-value color-{setting.penColor}",children:a.penColor})]})]}),e.jsxs("span",{className:"meta-item",children:[e.jsx("span",{className:"meta-label",children:"Size:"}),e.jsx("span",{className:"meta-value",children:a.handwritingSize})]}),e.jsxs("span",{className:"meta-item",children:[e.jsx("span",{className:"meta-label",children:"Paper:"}),e.jsxs("span",{className:"meta-value",children:[a.paperStyle," (",a.pageSize,")"]})]})]})]}),e.jsxs("div",{className:"settings-actions",children:[(m==null?void 0:m.id)!==a.id&&e.jsx("button",{className:"action-btn",onClick:()=>P(a),title:"Set as active",disabled:o,children:e.jsx(Oe,{size:16})}),e.jsx("button",{className:"action-btn",onClick:()=>O(a),title:"Edit",disabled:o,children:e.jsx(gs,{size:16})}),y&&e.jsx("button",{className:"action-btn",onClick:()=>le(a.id),title:"Duplicate",disabled:o,children:e.jsx(Ds,{size:16})}),u.length>1&&e.jsx("button",{className:"action-btn danger",onClick:()=>se(a.id),title:"Delete",disabled:o||a.isDefault,children:e.jsx($e,{size:16})})]})]})},a.id))})]}):e.jsxs("div",{className:`generation-settings-panel ${i} editing`,children:[e.jsxs("div",{className:"panel-header",children:[e.jsx("h3",{children:I?"Create Settings":"Edit Settings"}),e.jsxs("div",{className:"header-actions",children:[e.jsx("button",{className:"btn-secondary",onClick:$,disabled:o,children:"Cancel"}),e.jsx("button",{className:"btn-primary",onClick:ee,disabled:o||!((U=d.name)!=null&&U.trim()),children:o?"Saving...":I?"Create":"Save"})]})]}),e.jsxs("div",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Basic Information"}),e.jsxs("div",{className:"form-grid",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Name *"}),e.jsx("input",{type:"text",value:d.name||"",onChange:a=>g("name",a.target.value),placeholder:"My Handwriting Settings",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Description"}),e.jsx("input",{type:"text",value:d.description||"",onChange:a=>g("description",a.target.value),placeholder:"Optional description"})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Handwriting Mode"}),e.jsx("div",{className:"mode-selector",children:["personal","realistic"].map(a=>e.jsx("button",{type:"button",className:`mode-option ${d.handwritingMode===a?"selected":""}`,onClick:()=>g("handwritingMode",a),children:a==="personal"?"Personal Handwriting":"Realistic Handwriting"},a))})]}),d.handwritingMode==="realistic"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Realistic Style Options"}),e.jsxs("div",{className:"form-grid",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Style"}),e.jsx("div",{className:"select-grid",children:["cursive","print","mixed","calligraphy"].map(a=>e.jsx("button",{type:"button",className:`style-option ${d.realisticStyle===a?"selected":""}`,onClick:()=>g("realisticStyle",a),children:a.charAt(0).toUpperCase()+a.slice(1)},a))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Pen Color"}),e.jsx("div",{className:"select-grid",children:["blue","black"].map(a=>e.jsxs("button",{type:"button",className:`color-option ${d.penColor===a?"selected":""}`,onClick:()=>g("penColor",a),children:[e.jsx("span",{className:"color-swatch",style:{backgroundColor:a==="blue"?"#1e3a5f":"#1a1a2e"}}),a.charAt(0).toUpperCase()+a.slice(1)]},a))})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Handwriting Appearance"}),e.jsxs("div",{className:"form-grid",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Size"}),e.jsx("select",{value:d.handwritingSize||"medium",onChange:a=>g("handwritingSize",a.target.value),children:Xs.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Line Spacing"}),e.jsx("input",{type:"range",min:"0.5",max:"2",step:"0.1",value:d.lineSpacing||1,onChange:a=>g("lineSpacing",parseFloat(a.target.value))}),e.jsxs("span",{className:"range-value",children:[(T=d.lineSpacing)==null?void 0:T.toFixed(1),"x"]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Word Spacing"}),e.jsx("input",{type:"range",min:"0.5",max:"2",step:"0.1",value:d.wordSpacing||1,onChange:a=>g("wordSpacing",parseFloat(a.target.value))}),e.jsxs("span",{className:"range-value",children:[(ae=d.wordSpacing)==null?void 0:ae.toFixed(1),"x"]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Character Spacing"}),e.jsx("input",{type:"range",min:"0.5",max:"2",step:"0.1",value:d.characterSpacing||1,onChange:a=>g("characterSpacing",parseFloat(a.target.value))}),e.jsxs("span",{className:"range-value",children:[(b=d.characterSpacing)==null?void 0:b.toFixed(1),"x"]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Pen Thickness"}),e.jsx("input",{type:"range",min:"0.3",max:"3",step:"0.1",value:d.penThickness||1,onChange:a=>g("penThickness",parseFloat(a.target.value))}),e.jsxs("span",{className:"range-value",children:[(p=d.penThickness)==null?void 0:p.toFixed(1),"x"]})]})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Page Layout"}),e.jsxs("div",{className:"form-grid",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Question Start Mode"}),e.jsx("select",{value:d.questionStartMode||"continuous",onChange:a=>g("questionStartMode",a.target.value),children:qs.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Paper Style"}),e.jsx("select",{value:d.paperStyle||"ruled",onChange:a=>g("paperStyle",a.target.value),children:Ys.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Page Size"}),e.jsx("select",{value:d.pageSize||"A4",onChange:a=>g("pageSize",a.target.value),children:Ws.map(a=>e.jsxs("option",{value:a.value,children:[a.label," (",a.dimensions,")"]},a.value))})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Show Question Numbers"}),e.jsx("div",{className:"checkbox-wrapper",children:e.jsx("input",{type:"checkbox",checked:d.showQuestionNumbers??!0,onChange:a=>g("showQuestionNumbers",a.target.checked)})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Show Page Numbers"}),e.jsx("div",{className:"checkbox-wrapper",children:e.jsx("input",{type:"checkbox",checked:d.showPageNumbers??!0,onChange:a=>g("showPageNumbers",a.target.checked)})})]})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h4",{children:"Margins (pixels)"}),e.jsx("div",{className:"margins-grid",children:["top","right","bottom","left"].map(a=>{var f;return e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:a.charAt(0).toUpperCase()+a.slice(1)}),e.jsx("input",{type:"number",value:((f=d.margins)==null?void 0:f[a])||60,onChange:F=>D("margins",a,parseInt(F.target.value)||60),min:"20",max:"200"})]},a)})})]}),e.jsx("div",{className:"form-section",children:e.jsxs("label",{className:"checkbox-label",children:[e.jsx("input",{type:"checkbox",checked:d.isDefault||!1,onChange:a=>g("isDefault",a.target.checked)}),"Set as default settings"]})})]})]})}const Re=[{id:"initializing",label:"Initializing",icon:ve,description:"Setting up generation environment"},{id:"analyzing",label:"Analyzing",icon:Z,description:"Processing handwriting characteristics"},{id:"generating",label:"Generating",icon:ve,description:"Creating handwritten pages"},{id:"rendering",label:"Rendering",icon:Z,description:"Rendering page layouts"},{id:"exporting",label:"Exporting",icon:Qe,description:"Generating PDF and DOCX files"},{id:"completed",label:"Completed",icon:Oe,description:"Generation finished successfully"},{id:"failed",label:"Failed",icon:Te,description:"Generation encountered an error"}],ke={baseInterval:2e3,maxInterval:1e4,backoffMultiplier:1.5,jitterFactor:.2};function Zs({isOpen:u,onClose:m,jobId:o,onCancel:R,onDownloadPDF:_,onDownloadDOCX:L,onViewAssignment:P,pollInterval:y=ke.baseInterval}){const[i,S]=c.useState(null),[k,d]=c.useState(null),[A,I]=c.useState(!1),E=c.useRef(y),O=c.useRef(0),z=c.useRef(null),$=c.useRef(!0);c.useEffect(()=>(E.current=y,O.current=0,$.current=!0,()=>{$.current=!1,z.current&&clearTimeout(z.current)}),[o,y]);const ee=c.useCallback(async()=>{if(!(!o||!$.current)){try{const b=await fetch(`/api/handwriting/generate/${o}`,{headers:{"Content-Type":"application/json"},credentials:"include"});if(!$.current)return;if(b.ok){O.current=0,E.current=Math.max(y,E.current*.9);const p=await b.json();if(d(p.job),p.job.pagesData&&S({stage:p.job.status==="completed"?"completed":p.job.status==="failed"?"failed":"generating",progress:p.job.status==="completed"?100:p.job.status==="failed"?0:Math.min(90,10+(p.job.totalPages||1)*10),message:se(p.job.status,p.job.totalPages),totalPages:p.job.totalPages,currentPage:p.job.totalPages,error:p.job.errorMessage}),p.job.status==="completed"||p.job.status==="failed"){I(!1);return}}else throw new Error(`HTTP ${b.status}`)}catch(b){if(!$.current)return;O.current++,console.warn(`Failed to fetch job (attempt ${O.current}):`,b);const p=Math.min(E.current*ke.backoffMultiplier,ke.maxInterval),a=p*ke.jitterFactor*Math.random();E.current=p+a}$.current&&A&&(z.current=setTimeout(ee,E.current))}},[o,y,A]);c.useEffect(()=>{if(!u||!o){S(null),d(null),I(!1),z.current&&(clearTimeout(z.current),z.current=null);return}return I(!0),E.current=y,O.current=0,ee(),()=>{z.current&&(clearTimeout(z.current),z.current=null)}},[u,o,ee]);const se=(b,p)=>{switch(b){case"pending":return"Waiting to start...";case"generating":return`Generating ${p} page(s)...`;case"completed":return`Successfully generated ${p} page(s)!`;case"failed":return"Generation failed";default:return"Processing..."}},le=()=>{R&&R(),I(!1)},g=()=>{o&&_&&_(o)},D=()=>{o&&L&&L(o)},U=()=>{o&&P&&P(o)};if(!u)return null;const T=i?Re.findIndex(b=>b.id===i.stage):0,ae=(i==null?void 0:i.progress)||0;return e.jsx("div",{className:"modal-overlay",onClick:m,children:e.jsxs("div",{className:"modal-container",onClick:b=>b.stopPropagation(),children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("h2",{children:"Generating Handwritten Assignment"}),e.jsx("button",{className:"close-btn",onClick:m,disabled:A,children:e.jsx(is,{size:20})})]}),e.jsxs("div",{className:"modal-content",children:[e.jsxs("div",{className:"overall-progress",children:[e.jsxs("div",{className:"progress-header",children:[e.jsx("span",{className:"progress-label",children:"Overall Progress"}),e.jsxs("span",{className:"progress-percent",children:[Math.round(ae),"%"]})]}),e.jsx("div",{className:"progress-bar-container",children:e.jsx("div",{className:"progress-bar",style:{width:`${ae}%`}})}),i&&e.jsx("p",{className:"progress-message",children:i.message})]}),e.jsx("div",{className:"stages",children:Re.map((b,p)=>{const a=p<T,f=p===T,F=(i==null?void 0:i.stage)==="failed"&&f;return e.jsxs("div",{className:`stage ${a?"completed":""} ${f?"current":""} ${F?"failed":""}`,children:[e.jsx("div",{className:"stage-indicator",children:a?e.jsx(Oe,{size:20}):F?e.jsx(Te,{size:20}):f?e.jsx(ve,{size:20,className:"spinning"}):e.jsx("span",{className:"stage-number",children:p+1})}),e.jsxs("div",{className:"stage-content",children:[e.jsxs("div",{className:"stage-title-row",children:[e.jsx("h4",{children:b.label}),f&&A&&e.jsx("span",{className:"stage-status",children:"In Progress"}),a&&e.jsx("span",{className:"stage-status completed",children:"Done"}),F&&e.jsx("span",{className:"stage-status failed",children:"Failed"})]}),e.jsx("p",{className:"stage-description",children:b.description})]}),p<Re.length-1&&e.jsx("div",{className:"stage-connector",style:{height:a?"100%":"0%"}})]},b.id)})}),(i==null?void 0:i.stage)==="failed"&&i.error&&e.jsxs("div",{className:"error-display",children:[e.jsx(Te,{size:20}),e.jsx("p",{children:i.error})]}),i&&(i.stage==="rendering"||i.stage==="generating")&&i.totalPages&&e.jsxs("div",{className:"page-progress",children:[e.jsx("div",{className:"page-progress-header",children:e.jsxs("span",{children:["Pages: ",i.currentPage||1," / ",i.totalPages]})}),e.jsx("div",{className:"page-progress-bar-container",children:e.jsx("div",{className:"page-progress-bar",style:{width:`${(i.currentPage||1)/i.totalPages*100}%`}})})]})]}),e.jsxs("div",{className:"modal-actions",children:[(i==null?void 0:i.stage)==="completed"&&k&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{className:"btn btn-primary",onClick:g,children:[e.jsx(Qe,{size:18}),"Download PDF"]}),e.jsxs("button",{className:"btn btn-secondary",onClick:D,children:[e.jsx(Z,{size:18}),"Download DOCX"]}),e.jsxs("button",{className:"btn btn-outline",onClick:U,children:[e.jsx(Fs,{size:18}),"View Assignment"]})]}),A&&(i==null?void 0:i.stage)!=="completed"&&(i==null?void 0:i.stage)!=="failed"&&R&&e.jsxs("button",{className:"btn btn-danger",onClick:le,children:[e.jsx(is,{size:18}),"Cancel Generation"]}),((i==null?void 0:i.stage)==="completed"||(i==null?void 0:i.stage)==="failed")&&!A&&e.jsx("button",{className:"btn btn-primary",onClick:m,children:"Done"})]})]})})}const ea=`
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  .modal-container {
    background: var(--bg-secondary, #fff);
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .close-btn:hover:not(:disabled) {
    background: var(--bg-tertiary, #f3f4f6);
    color: var(--text-primary, #1f2937);
  }

  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-content {
    padding: 24px;
    overflow-y: auto;
    flex: 1;
  }

  /* Overall Progress */
  .overall-progress {
    margin-bottom: 24px;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .progress-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .progress-percent {
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-color, #3b82f6);
  }

  .progress-bar-container {
    height: 8px;
    background: var(--bg-tertiary, #e5e7eb);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--primary-color, #3b82f6), var(--primary-light, #60a5fa));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-message {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--text-secondary, #6b7280);
  }

  /* Stages */
  .stages {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-bottom: 20px;
  }

  .stage {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 0;
    position: relative;
  }

  .stage:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 48px;
    bottom: 0;
    width: 2px;
    background: var(--border-color, #e5e7eb);
    z-index: 0;
  }

  .stage-connector {
    position: absolute;
    left: 11px;
    top: 48px;
    bottom: 0;
    width: 2px;
    background: var(--primary-color, #3b82f6);
    z-index: 1;
    transition: height 0.3s ease;
  }

  .stage-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bg-tertiary, #e5e7eb);
    color: var(--text-tertiary, #9ca3af);
    flex-shrink: 0;
    z-index: 2;
    transition: all 0.3s ease;
  }

  .stage.completed .stage-indicator {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .stage.current .stage-indicator {
    background: var(--primary-color, #3b82f6);
    color: white;
  }

  .stage.failed .stage-indicator {
    background: #ef4444;
    color: white;
  }

  .stage-number {
    font-size: 12px;
    font-weight: 600;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .stage-content {
    flex: 1;
    min-width: 0;
  }

  .stage-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
  }

  .stage-title-row h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #1f2937);
  }

  .stage-status {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
  }

  .stage-status.completed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .stage-status.failed {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  .stage-description {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
  }

  .stage.completed .stage-title-row h4,
  .stage.completed .stage-description {
    color: var(--text-secondary, #6b7280);
  }

  /* Error Display */
  .error-display {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    margin-bottom: 20px;
    color: #ef4444;
  }

  .error-display svg {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .error-display p {
    margin: 0;
    font-size: 13px;
  }

  /* Page Progress */
  .page-progress {
    padding: 16px;
    background: var(--bg-tertiary, #f3f4f6);
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .page-progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .page-progress-bar-container {
    height: 6px;
    background: var(--border-color, #e5e7eb);
    border-radius: 3px;
    overflow: hidden;
  }

  .page-progress-bar {
    height: 100%;
    background: var(--primary-color, #3b82f6);
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  /* Actions */
  .modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 24px;
    border-top: 1px solid var(--border-color, #e5e7eb);
    justify-content: flex-end;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color, #3b82f6), var(--primary-dark, #2563eb));
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f3f4f6);
    color: var(--text-primary, #1f2937);
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .btn-secondary:hover {
    background: var(--border-color, #e5e7eb);
  }

  .btn-outline {
    background: transparent;
    color: var(--primary-color, #3b82f6);
    border: 1px solid var(--primary-color, #3b82f6);
  }

  .btn-outline:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  .btn-danger:hover {
    background: #dc2626;
  }

  @media (prefers-color-scheme: dark) {
    .modal-container {
      background: var(--bg-secondary, #1f2937);
    }

    .progress-bar-container,
    .page-progress-bar-container {
      background: var(--bg-tertiary, #374151);
    }

    .stage:not(:last-child)::before {
      background: var(--border-color, #374151);
    }

    .stage-indicator {
      background: var(--bg-tertiary, #374151);
      color: var(--text-tertiary, #6b7280);
    }

    .stage-title-row h4 {
      color: var(--text-primary, #f3f4f6);
    }

    .stage.completed .stage-title-row h4,
    .stage.completed .stage-description {
      color: var(--text-tertiary, #9ca3af);
    }

    .stage-description {
      color: var(--text-secondary, #9ca3af);
    }

    .error-display {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .page-progress {
      background: var(--bg-tertiary, #374151);
    }

    .btn-secondary {
      background: var(--bg-tertiary, #374151);
      border-color: var(--border-color, #4b5563);
      color: var(--text-primary, #f3f4f6);
    }

    .btn-secondary:hover {
      background: var(--border-color, #4b5563);
    }
  }
`;if(typeof document<"u"){const u="generation-progress-modal-styles";if(!document.getElementById(u)){const m=document.createElement("style");m.id=u,m.textContent=ea,document.head.appendChild(m)}}const ms=c.lazy(()=>Is(()=>import("./HandwritingPreview-BXzm74kN.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11]),import.meta.url).then(u=>({default:u.HandwritingPreview}))),sa={handwritingSize:"medium",lineSpacing:1,wordSpacing:1,characterSpacing:1,margins:{top:80,right:60,bottom:80,left:60},penThickness:1,questionStartMode:"continuous",showQuestionNumbers:!0,showPageNumbers:!0},aa=[{value:"ruled",label:"Ruled Notebook",description:"Classic lined paper with margins"},{value:"plain",label:"Plain White",description:"Clean white paper without lines"},{value:"grid",label:"Grid Paper",description:"Graph paper for diagrams and math"}],ta=[{value:"A4",label:"A4 (210 × 297 mm)"},{value:"A5",label:"A5 (148 × 210 mm)"},{value:"Letter",label:"Letter (8.5 × 11 in)"},{value:"Legal",label:"Legal (8.5 × 14 in)"}],na=Vs.map(u=>({value:u.id,label:u.name})),ra={style:"cursive",penColor:"blue",sizeMultiplier:1,spacingMultiplier:1,thicknessMultiplier:1,variationLevel:"medium",paperStyle:"ruled",margins:{top:80,right:60,bottom:80,left:60},paragraphAlignment:"left",lineVariation:!0,wordVariation:!0};function ia(){const u=Ms(),m=Es(),{activeProfile:o,samples:R,isSamplesLoading:_,generationSettings:L,activeGenerationSettings:P,isSettingsLoading:y,forgeStatus:i,addSample:S,removeSample:k,setPrimarySample:d,analyzeMultiSample:A,fetchSamples:I,createGenerationJob:E,getGenerationJob:O,cancelGenerationJob:z,setActiveGenerationSettings:$,retryForgeConnection:ee}=Cs(),[se,le]=c.useState(!1),[g,D]=c.useState(1),[U,T]=c.useState(!1),[ae,b]=c.useState(!1),[p,a]=c.useState(!1),[f,F]=c.useState(null),[C,He]=c.useState(null),[_e,us]=c.useState([]),[j,Ue]=c.useState("realistic"),[Y,we]=c.useState(ra),[te,he]=c.useState(null),[B,Be]=c.useState(""),[Q,Je]=c.useState(""),[ue,Ve]=c.useState("university"),[x,oe]=c.useState([]),[G,pe]=c.useState({}),[W,xe]=c.useState({}),[ce,Xe]=c.useState("ruled"),[be,qe]=c.useState("A4"),[K,fe]=c.useState(sa),[de,Ye]=c.useState([]);c.useEffect(()=>{m.id&&(async()=>{try{const t=(await M.get(`/assignments/${m.id}`)).data.assignment;if(Be(t.title),Je(t.subject),Ve(t.level),oe(t.questions),Xe(t.paperStyle),qe(t.pageSize),fe(t.settings),t.handwritingMode&&Ue(t.handwritingMode),t.realisticOptions&&we(t.realisticOptions),t.generationSettingsId&&he(t.generationSettingsId),t.answers&&t.answers.length>0){const r={},l={};t.answers.forEach(v=>{r[v.questionId]=v.content,l[v.questionId]=v.length}),pe(r),xe(l),D(3)}}catch{h.error("Failed to load assignment"),u("/dashboard")}})()},[m.id,u]),c.useEffect(()=>{o&&j==="personal"&&I(o.id)},[o,j,I]),c.useEffect(()=>{P&&!te&&he(P.id)},[P,te]),c.useEffect(()=>{(async()=>{try{const n=sessionStorage.getItem(Ce);if(n){const t=JSON.parse(n);if(Date.now()-t.timestamp<864e5){const r=await O(t.jobId);r&&(r.status==="generating"||r.status==="pending")?(F(r.id),a(!0),h("Resuming generation...",{icon:"ℹ️"})):r&&(r.status==="completed"||r.status==="failed")?(je(),r.status==="completed"&&(He(r),D(4))):je()}else je()}}catch(n){console.warn("Failed to resume generation:",n),je()}})()},[O]),c.useEffect(()=>{},[j]);const ps=()=>{const s={id:me(),text:"",type:"medium",subject:Q,order:x.length+1,estimatedLength:100};oe([...x,s]),xe(n=>({...n,[s.id]:"medium"}))},xs=s=>{oe(n=>n.filter(t=>t.id!==s)),pe(n=>{const t={...n};return delete t[s],t}),xe(n=>{const t={...n};return delete t[s],t})},We=(s,n,t)=>{oe(r=>r.map(l=>l.id===s?{...l,text:n,type:t||l.type}:l))},Ke=(s,n)=>{xe(t=>({...t,[s]:n}))},Ze=(s,n)=>{const t=[...x],[r]=t.splice(s,1);t.splice(n,0,r),oe(t.map((l,v)=>({...l,order:v+1})))},es=async s=>{const n=s.filter(t=>ns(t)||As(t));n.length!==s.length&&h.error("Some files were rejected. Only images (JPG, PNG) and PDFs are allowed."),Ye(t=>[...t,...n]);for(const t of n)try{const r=new FormData;r.append("file",t);const v=(await M.post("/files/upload",r,{headers:{"Content-Type":"multipart/form-data"}})).data.file.id,H=await M.post("/ai/ocr",{fileId:v});if(H.data.text){const w=H.data.text,Ne=bs(w);Ne.length>0?(oe(ze=>[...ze,...Ne]),Ne.forEach(ze=>{xe(ks=>({...ks,[ze.id]:"medium"}))}),h.success(`Extracted ${Ne.length} question(s) from ${t.name}`)):h.success(`Processed ${t.name} (no questions detected)`)}}catch(r){console.error("OCR failed:",r),h.error(`Failed to process ${t.name}`)}},bs=s=>{const n=s.split(`
`).map(l=>l.trim()).filter(l=>l.length>0),t=[];let r="";for(const l of n)(/^[Qq]\d*[\.\)]\s/.test(l)||/^[Qq]uestion\s*\d*/.test(l)||l.endsWith("?"))&&r?(t.push({id:me(),text:r.trim(),type:"medium",subject:Q,order:t.length+1,estimatedLength:100}),r=l):r+=(r?" ":"")+l;return r.trim()&&t.push({id:me(),text:r.trim(),type:"medium",subject:Q,order:t.length+1,estimatedLength:100}),t.length===0&&s.trim()&&t.push({id:me(),text:s.trim().substring(0,500),type:"medium",subject:Q,order:1,estimatedLength:100}),t},fs=s=>{Ye(n=>n.filter((t,r)=>r!==s))},ss=async()=>{var s,n;if(x.length===0){h.error("Please add at least one question");return}if(x.some(t=>!t.text.trim())){h.error("Please fill in all questions");return}T(!0);try{const t=await M.post("/ai/generate-answers",{questions:x.map(l=>({id:l.id,text:l.text,type:W[l.id]||"medium",subject:Q,order:l.order})),subject:Q,level:ue,handwritingProfileId:o==null?void 0:o.id}),r={};t.data.answers.forEach(l=>{r[l.questionId]=l.content}),pe(r),D(3),h.success("Answers generated successfully!")}catch(t){h.error(((n=(s=t.response)==null?void 0:s.data)==null?void 0:n.message)||"Failed to generate answers")}finally{T(!1)}},js=async(s,n)=>{var t,r;try{const l=await M.post("/ai/generate-answer",{question:s.text,subject:Q,level:ue,length:n});pe(v=>({...v,[s.id]:l.data.answer})),h.success("Answer regenerated")}catch(l){h.error(((r=(t=l.response)==null?void 0:t.data)==null?void 0:r.message)||"Failed to regenerate answer")}},Ce="handwriting_generation_resume",vs=(s,n)=>{try{const t={jobId:s,options:n,timestamp:Date.now(),step:4};sessionStorage.setItem(Ce,JSON.stringify(t))}catch(t){console.warn("Failed to save generation state:",t)}},je=()=>{try{sessionStorage.removeItem(Ce)}catch(s){console.warn("Failed to clear generation state:",s)}},ws=async()=>{var s,n;if(x.length===0){h.error("Please add at least one question");return}if(Object.keys(G).length===0){h.error("Please generate answers first");return}if(!o){h.error("Please create a handwriting profile first");return}T(!0);try{const t=x.map(w=>({questionId:w.id,content:G[w.id]||"",length:W[w.id]||"medium"})),r={title:B,subject:Q,level:ue,questions:x,answers:t,handwritingProfileId:o.id,paperStyle:ce,pageSize:be,settings:K,handwritingMode:j,realisticOptions:j==="realistic"?Y:void 0,generationSettingsId:te};let l;m.id?(await M.put(`/assignments/${m.id}`,r),l=m.id,h.success("Assignment updated!")):(l=(await M.post("/assignments",r)).data.assignment.id,h.success("Assignment saved!"));const v={assignmentId:l,mode:j,handwritingProfileId:o.id,generationSettingsId:te,realisticOptions:j==="realistic"?Y:void 0,forgeOptions:{useForge:(i==null?void 0:i.healthy)&&j==="realistic"}},H=await E(v);vs(H.id,v),F(H.id),a(!0)}catch(t){h.error(((n=(s=t.response)==null?void 0:s.data)==null?void 0:n.message)||"Failed to start generation"),T(!1)}},Ns=async s=>{try{const n=await O(s);n&&(He(n),n.pagesData&&us(n.pagesData),(n.status==="completed"||n.status==="failed")&&je())}catch(n){console.error("Failed to fetch completed job:",n)}},ys=async()=>{f&&await Ns(f),a(!1),F(null),T(!1),D(4),h.success("Handwritten assignment generated successfully!")},as=async()=>{f&&await z(f),a(!1),F(null),T(!1)},Pe=async s=>{var t,r;const n=s||(C==null?void 0:C.id)||m.id;if(!n){h.error("No assignment available for download");return}try{const l=await M.get(`/assignments/${n}/pdf`,{responseType:"blob"}),v=new Blob([l.data],{type:"application/pdf"}),H=window.URL.createObjectURL(v),w=document.createElement("a");w.href=H,w.download=`${B||"assignment"}.pdf`,document.body.appendChild(w),w.click(),document.body.removeChild(w),window.URL.revokeObjectURL(H),h.success("PDF downloaded successfully")}catch(l){h.error(((r=(t=l.response)==null?void 0:t.data)==null?void 0:r.message)||"Failed to download PDF")}},Ae=async s=>{var t,r;const n=s||(C==null?void 0:C.id)||m.id;if(!n){h.error("No assignment available for download");return}try{const l=await M.get(`/assignments/${n}/docx`,{responseType:"blob"}),v=new Blob([l.data],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}),H=window.URL.createObjectURL(v),w=document.createElement("a");w.href=H,w.download=`${B||"assignment"}.docx`,document.body.appendChild(w),w.click(),document.body.removeChild(w),window.URL.revokeObjectURL(H),h.success("DOCX downloaded successfully")}catch(l){h.error(((r=(t=l.response)==null?void 0:t.data)==null?void 0:r.message)||"Failed to download DOCX")}},ts=()=>{window.print()},Ie=async()=>{var s,n;if(!B.trim()){h.error("Please enter an assignment title");return}if(x.length===0){h.error("Please add at least one question");return}if(!o){h.error("Please create a handwriting profile first"),u("/handwriting-profile");return}try{const t=x.map(l=>({questionId:l.id,content:G[l.id]||"",length:W[l.id]||"medium"})),r={title:B,subject:Q,level:ue,questions:x,answers:t,handwritingProfileId:o.id,paperStyle:ce,pageSize:be,settings:K,handwritingMode:j,realisticOptions:j==="realistic"?Y:void 0,generationSettingsId:te};m.id?(await M.put(`/assignments/${m.id}`,r),h.success("Assignment updated!")):(await M.post("/assignments",r),h.success("Assignment saved!")),u("/my-assignments")}catch(t){h.error(((n=(s=t.response)==null?void 0:s.data)==null?void 0:n.message)||"Failed to save assignment")}},Ss=s=>{switch(s){case 1:return B.trim()&&Q&&x.length>0;case 2:return!0;case 3:return Object.keys(G).length>0;default:return!1}},ne=[{id:1,title:"Questions",icon:Z,description:"Enter your assignment questions"},{id:2,title:"Settings",icon:ge,description:"Configure handwriting and paper"},{id:3,title:"Generate",icon:ye,description:"Generate answers & handwriting"},{id:4,title:"Preview",icon:De,description:"Review and finalize"}];return e.jsxs("div",{className:"animate-fade-in",children:[e.jsxs("div",{className:"mb-8",children:[e.jsx("div",{className:"flex items-center justify-between",children:ne.map((s,n)=>e.jsx("div",{className:"flex items-center",children:e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${g>=s.id?"bg-gradient-to-br from-notebook-blue-500 to-notebook-purple-600 text-white":"bg-notebook-blue-100 text-notebook-blue-400"}`,children:g>s.id?e.jsx(Ge,{className:"w-5 h-5"}):e.jsx(s.icon,{className:"w-5 h-5"})}),n<ne.length-1&&e.jsx("div",{className:`w-16 h-0.5 mx-2 transition-all ${g>s.id?"bg-gradient-to-r from-notebook-blue-500 to-notebook-purple-600":"bg-notebook-blue-100"}`})]})},s.id))}),e.jsxs("div",{className:"mt-4 text-center text-sm text-notebook-blue-500",children:["Step ",g," of ",ne.length,": ",ne[g-1].description]})]}),e.jsxs("form",{onSubmit:s=>{s.preventDefault(),Ie()},className:"space-y-6",children:[e.jsx(Se,{tabId:"1",activeTab:g.toString(),children:e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(X,{children:"Assignment Questions"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx(N,{variant:"outline",type:"button",leftIcon:e.jsx(ls,{className:"w-4 h-4"}),onClick:()=>D(1),children:"Upload Files"}),e.jsx(N,{type:"button",leftIcon:e.jsx(Le,{className:"w-4 h-4"}),onClick:ps,children:"Add Question"})]})]})}),e.jsxs(q,{children:[e.jsxs("div",{className:"space-y-4 mb-6",children:[e.jsx(ds,{label:"Assignment Title",name:"title",value:B,onChange:s=>Be(s.target.value),placeholder:"e.g., Calculus Problem Set 3",leftIcon:e.jsx(Z,{className:"w-5 h-5"})}),e.jsxs("div",{className:"grid sm:grid-cols-2 gap-4",children:[e.jsx(ie,{label:"Subject",name:"subject",value:Q,onChange:s=>Je(s.target.value),options:na,placeholder:"Select subject"}),e.jsx(ie,{label:"Academic Level",name:"level",value:ue,onChange:s=>Ve(s.target.value),options:[{value:"school",label:"High School"},{value:"college",label:"College"},{value:"university",label:"University"},{value:"professional",label:"Professional"}],placeholder:"Select level"})]})]}),e.jsxs("div",{className:`upload-zone relative ${de.length>0?"upload-zone-active":""}`,onDragOver:s=>{s.preventDefault()},onDragLeave:s=>{s.preventDefault()},onDrop:s=>{s.preventDefault(),es(Array.from(s.dataTransfer.files))},children:[e.jsx("input",{type:"file",multiple:!0,accept:"image/*,.pdf",onChange:s=>s.target.files&&es(Array.from(s.target.files)),className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer"}),e.jsxs("div",{className:"flex flex-col items-center gap-3",children:[e.jsx(Rs,{className:"w-10 h-10 text-notebook-blue-400"}),e.jsx("p",{className:"text-notebook-blue-600 font-medium",children:de.length>0?`${de.length} file(s) uploaded`:"Drag & drop question papers or click to browse"}),e.jsx("p",{className:"text-sm text-notebook-blue-400",children:"Supports JPG, PNG, PDF (max 10MB each)"})]})]}),de.length>0&&e.jsx("div",{className:"mt-4 space-y-2",children:de.map((s,n)=>e.jsxs("div",{className:"flex items-center gap-3 p-3 bg-notebook-blue-50 rounded-xl",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-notebook-blue-100 flex items-center justify-center",children:ns(s)?e.jsx(ls,{className:"w-5 h-5 text-notebook-blue-600"}):e.jsx(Z,{className:"w-5 h-5 text-notebook-blue-600"})}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("p",{className:"text-sm font-medium text-notebook-ink-50 truncate",children:s.name}),e.jsx("p",{className:"text-xs text-notebook-blue-500",children:Ps(s.size)})]}),e.jsx(N,{variant:"ghost",size:"sm",onClick:()=>fs(n),children:e.jsx($e,{className:"w-4 h-4 text-red-500"})})]},n))}),x.length>0&&e.jsxs("div",{className:"mt-6 space-y-4",children:[e.jsx("h4",{className:"font-medium text-notebook-ink-50",children:"Questions"}),x.map((s,n)=>e.jsx(la,{question:s,index:n,answerLength:W[s.id]||"medium",answer:G[s.id],onTextChange:t=>We(s.id,t),onAnswerLengthChange:t=>Ke(s.id,t),onQuestionTypeChange:(t,r)=>{var l;return We(t,((l=x.find(v=>v.id===t))==null?void 0:l.text)||"",r)},onRemove:()=>xs(s.id),onMoveUp:()=>n>0&&Ze(n,n-1),onMoveDown:()=>n<x.length-1&&Ze(n,n+1)},s.id))]}),x.length===0&&de.length===0&&e.jsxs("div",{className:"text-center py-12",children:[e.jsx(Z,{className:"w-16 h-16 text-notebook-blue-200 mx-auto mb-4"}),e.jsx("p",{className:"text-notebook-blue-500",children:"Add questions manually or upload question papers"})]})]})]})}),e.jsx(Se,{tabId:"2",activeTab:g.toString(),children:e.jsxs("div",{className:"space-y-6",children:[e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(gs,{className:"w-5 h-5"}),"Handwriting Mode"]})}),e.jsx(q,{children:e.jsx(Us,{mode:j,onModeChange:Ue,realisticStyle:Y.style,onRealisticStyleChange:s=>{we(n=>({...n,style:s}))},penColor:Y.penColor,onPenColorChange:s=>{we(n=>({...n,penColor:s}))}})})]}),j==="personal"&&o&&e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(Ls,{className:"w-5 h-5"}),"Handwriting Samples (",R.length,"/5)"]})}),e.jsx(q,{children:e.jsx(Bs,{samples:R,isLoading:_||U,onAddSample:async(s,n)=>{o&&await S(o.id,s,n)},onRemoveSample:async s=>{await k(s)},onSetPrimary:async s=>{o&&await d(o.id,s)},onAnalyzeMulti:async()=>{o&&await A(o.id)},maxSamples:5})})]}),j==="realistic"&&e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(Ts,{className:"w-5 h-5"}),"Realistic Handwriting Settings"]})}),e.jsxs(q,{children:[e.jsx(Js,{options:Y,onChange:we,showAdvanced:!0}),i&&e.jsx("div",{className:`mt-4 p-4 rounded-xl ${i.healthy?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`,children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:`w-3 h-3 rounded-full ${i.healthy?"bg-green-500":"bg-red-500"}`}),e.jsxs("div",{className:"flex-1",children:[e.jsx("p",{className:"font-medium text-notebook-ink-50",children:i.healthy?"Forge AI Available":"Forge AI Unavailable"}),e.jsx("p",{className:"text-sm text-notebook-blue-500",children:i.healthy?"AI enhancement will be used for generation":"CSS-based engine will be used (Forge not responding)"})]}),e.jsx(N,{variant:"outline",size:"sm",onClick:async()=>{le(!0);const s=await ee();le(!1),s?h.success("Forge connection restored"):h.error("Forge still unavailable")},disabled:se,leftIcon:se?e.jsx(ve,{className:"w-4 h-4 animate-spin"}):e.jsx(Gs,{className:"w-4 h-4"}),children:se?"Retrying...":"Retry Connection"})]})})]})]}),e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(ge,{className:"w-5 h-5"}),"Generation Settings"]})}),e.jsx(q,{children:e.jsx(Ks,{settings:L,activeSettings:L.find(s=>s.id===te)||null,isLoading:y,onCreate:async s=>{const n=await M.post("/handwriting/generation-settings",s);he(n.data.settings.id)},onUpdate:async(s,n)=>{await M.put(`/handwriting/generation-settings/${s}`,n)},onDelete:async s=>{var n;await M.delete(`/handwriting/generation-settings/${s}`),te===s&&he(((n=L.find(t=>t.id!==s))==null?void 0:n.id)||null)},onSetActive:s=>{he((s==null?void 0:s.id)||null),s&&$(s)}})})]}),e.jsxs("div",{className:"grid lg:grid-cols-2 gap-6",children:[e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(Z,{className:"w-5 h-5"}),"Paper Settings"]})}),e.jsxs(q,{className:"space-y-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"label-text",children:"Paper Style"}),e.jsx("div",{className:"grid grid-cols-3 gap-3",children:aa.map(s=>e.jsxs("label",{className:`p-4 rounded-xl border-2 cursor-pointer transition-all ${ce===s.value?"border-notebook-blue-500 bg-notebook-blue-50":"border-notebook-blue-100 hover:border-notebook-blue-300"}`,children:[e.jsx("input",{type:"radio",name:"paperStyle",value:s.value,checked:ce===s.value,onChange:n=>Xe(n.target.value),className:"sr-only"}),e.jsx("p",{className:"font-medium text-notebook-ink-50",children:s.label}),e.jsx("p",{className:"text-sm text-notebook-blue-500 mt-1",children:s.description})]},s.value))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"label-text",children:"Page Size"}),e.jsx(ie,{value:be,onChange:s=>qe(s.target.value),options:ta,placeholder:"Select page size"})]}),e.jsx("div",{className:"grid grid-cols-2 gap-4",children:[{key:"top",label:"Top Margin (px)"},{key:"right",label:"Right Margin (px)"},{key:"bottom",label:"Bottom Margin (px)"},{key:"left",label:"Left Margin (px)"}].map(({key:s,label:n})=>e.jsxs("div",{children:[e.jsx("label",{className:"label-text",children:n}),e.jsx(ds,{type:"number",value:K.margins[s],onChange:t=>fe(r=>({...r,margins:{...r.margins,[s]:parseInt(t.target.value)||0}})),min:"0"})]},s))})]})]}),e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(ge,{className:"w-5 h-5"}),"Question Layout"]})}),e.jsxs(q,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"label-text",children:"Question Start Mode"}),e.jsx(ie,{value:K.questionStartMode,onChange:s=>fe(n=>({...n,questionStartMode:s.target.value})),options:[{value:"continuous",label:"Continuous"},{value:"new-line",label:"New Line"},{value:"new-page",label:"New Page"}],placeholder:"Select mode"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{type:"checkbox",checked:K.showQuestionNumbers,onChange:s=>fe(n=>({...n,showQuestionNumbers:s.target.checked})),className:"w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"}),e.jsx("span",{className:"text-sm text-notebook-ink-50",children:"Show Question Numbers"})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer",children:[e.jsx("input",{type:"checkbox",checked:K.showPageNumbers,onChange:s=>fe(n=>({...n,showPageNumbers:s.target.checked})),className:"w-4 h-4 rounded border-notebook-blue-300 text-notebook-blue-600 focus:ring-notebook-blue-500"}),e.jsx("span",{className:"text-sm text-notebook-ink-50",children:"Show Page Numbers"})]})]})]})]})]})]})}),e.jsx(Se,{tabId:"3",activeTab:g.toString(),children:e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(ye,{className:"w-5 h-5"}),"Generate Handwritten Assignment"]})}),e.jsx(q,{children:e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"p-4 bg-notebook-blue-50 rounded-xl",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-12 h-12 rounded-xl bg-notebook-blue-100 flex items-center justify-center",children:e.jsx(ye,{className:"w-6 h-6 text-notebook-blue-600"})}),e.jsxs("div",{children:[e.jsx("h4",{className:"font-medium text-notebook-ink-50",children:"Ready to Generate"}),e.jsxs("p",{className:"text-sm text-notebook-blue-600",children:[x.length," question(s) · ",Object.keys(G).length," answer(s) ·"," ",j==="personal"?"Personal Handwriting":"Realistic Handwriting"]})]})]})}),e.jsxs("div",{className:"space-y-4",children:[e.jsx("h4",{className:"font-medium text-notebook-ink-50",children:"Generated Answers"}),x.map((s,n)=>e.jsx(oa,{question:s,answer:G[s.id],answerLength:W[s.id]||"medium",onAnswerLengthChange:t=>Ke(s.id,t),onEdit:t=>{pe(r=>({...r,[s.id]:t}))},onRegenerate:()=>{const t=W[s.id]||"medium";js(s,t)}},s.id))]}),x.length>0&&Object.keys(G).length===0&&e.jsxs("div",{className:"text-center py-12",children:[e.jsx(ye,{className:"w-16 h-16 text-notebook-blue-200 mx-auto mb-4"}),e.jsx("p",{className:"text-notebook-blue-500 mb-4",children:'Click "Generate Answers" to create AI-powered responses'}),e.jsx(N,{onClick:ss,isLoading:U,leftIcon:e.jsx(os,{className:"w-5 h-5"}),children:"Generate Answers"})]}),Object.keys(G).length>0&&e.jsxs("div",{className:"pt-4 border-t border-notebook-blue-100",children:[e.jsx(N,{onClick:ws,isLoading:U,className:"w-full",size:"lg",leftIcon:j==="personal"?e.jsx(Os,{className:"w-5 h-5"}):e.jsx($s,{className:"w-5 h-5"}),children:j==="personal"?"Generate Handwritten Assignment (Personal)":"Generate Handwritten Assignment (Realistic)"}),e.jsx("p",{className:"text-center text-sm text-notebook-blue-500 mt-2",children:j==="personal"?"Uses your uploaded handwriting samples":"Uses AI-generated realistic handwriting styles"})]})]})}),e.jsx(rs,{children:e.jsxs("div",{className:"flex justify-between w-full",children:[e.jsx(N,{variant:"outline",onClick:()=>D(2),leftIcon:e.jsx(Fe,{className:"w-4 h-4"}),children:"Back"}),Object.keys(G).length===0?e.jsx(N,{onClick:ss,isLoading:U,rightIcon:e.jsx(Me,{className:"w-4 h-4"}),leftIcon:e.jsx(os,{className:"w-5 h-5"}),children:"Generate Answers"}):e.jsx(N,{onClick:()=>D(4),rightIcon:e.jsx(Me,{className:"w-4 h-4"}),children:"Preview"})]})})]})}),e.jsx(Se,{tabId:"4",activeTab:g.toString(),children:e.jsxs(J,{children:[e.jsx(V,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs(X,{className:"flex items-center gap-2",children:[e.jsx(De,{className:"w-5 h-5"}),"Handwriting Preview"]}),e.jsx(N,{variant:"outline",onClick:()=>b(!0),leftIcon:e.jsx(De,{className:"w-4 h-4"}),children:"Full Screen Preview"})]})}),e.jsx(q,{children:e.jsx(c.Suspense,{fallback:e.jsxs("div",{className:"flex items-center justify-center py-12",children:[e.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 border-notebook-blue-500"}),e.jsx("span",{className:"ml-3 text-notebook-blue-500",children:"Loading preview..."})]}),children:e.jsx(ms,{title:B||"Assignment Preview",paperStyle:ce,pageSize:be,generatedPages:_e,questions:x,answers:x.map(s=>({id:me(),questionId:s.id,content:G[s.id]||"",length:W[s.id]||"medium",isEdited:!1,generatedAt:new Date().toISOString()})),settings:K,mode:j,realisticOptions:j==="realistic"?Y:void 0,profileCharacteristics:(o==null?void 0:o.characteristics)||null,onDownloadPDF:Pe,onDownloadDOCX:Ae,onPrint:ts})})}),e.jsx(rs,{children:e.jsxs("div",{className:"flex justify-between w-full",children:[e.jsx(N,{variant:"outline",onClick:()=>D(3),leftIcon:e.jsx(Fe,{className:"w-4 h-4"}),children:"Back"}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx(N,{variant:"outline",onClick:Ie,leftIcon:e.jsx(Qs,{className:"w-4 h-4"}),children:"Save Draft"}),e.jsx(N,{onClick:Ie,rightIcon:e.jsx(Qe,{className:"w-4 h-4"}),leftIcon:e.jsx(Ge,{className:"w-4 h-4"}),children:"Finalize & Download"})]})]})})]})})]}),e.jsxs("div",{className:"mt-6 flex justify-between",role:"navigation","aria-label":"Step navigation",children:[e.jsx(N,{variant:"outline",onClick:()=>D(Math.max(1,g-1)),disabled:g===1,leftIcon:e.jsx(Fe,{className:"w-4 h-4"}),children:"Previous"}),e.jsxs("div",{className:"flex items-center gap-4 text-sm text-notebook-blue-500",children:["Step ",g," of ",ne.length]}),e.jsx(N,{onClick:()=>D(Math.min(ne.length,g+1)),disabled:g===ne.length||!Ss(g),rightIcon:e.jsx(Me,{className:"w-4 h-4"}),children:"Next"})]}),e.jsx(_s,{isOpen:ae,onClose:()=>b(!1),title:"Full Preview",size:"full",children:e.jsx(c.Suspense,{fallback:e.jsxs("div",{className:"flex items-center justify-center py-12",children:[e.jsx("div",{className:"animate-spin rounded-full h-8 w-8 border-b-2 border-notebook-blue-500"}),e.jsx("span",{className:"ml-3 text-notebook-blue-500",children:"Loading preview..."})]}),children:e.jsx(ms,{title:B||"Assignment Preview",paperStyle:ce,pageSize:be,generatedPages:_e,questions:x,answers:x.map(s=>({id:me(),questionId:s.id,content:G[s.id]||"",length:W[s.id]||"medium",isEdited:!1,generatedAt:new Date().toISOString()})),settings:K,mode:j,realisticOptions:j==="realistic"?Y:void 0,profileCharacteristics:(o==null?void 0:o.characteristics)||null,onDownloadPDF:Pe,onDownloadDOCX:Ae,onPrint:ts})})}),e.jsx(Zs,{isOpen:p,onClose:as,jobId:f,onCancel:as,onDownloadPDF:()=>Pe(C==null?void 0:C.id),onDownloadDOCX:()=>Ae(C==null?void 0:C.id),onViewAssignment:()=>{ys(),u("/my-assignments")}})]})}function la({question:u,index:m,answerLength:o,answer:R,onTextChange:_,onAnswerLengthChange:L,onQuestionTypeChange:P,onRemove:y,onMoveUp:i,onMoveDown:S}){return e.jsx("div",{className:"bg-white rounded-xl border border-notebook-blue-100 p-4",children:e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsxs("div",{className:"flex flex-col items-center gap-1 text-notebook-blue-400 pt-1",children:[e.jsx("button",{onClick:i,disabled:m===0,className:"p-1 hover:bg-notebook-blue-100 rounded","aria-label":"Move up",children:e.jsx(cs,{className:"w-4 h-4 rotate-180"})}),e.jsx("span",{className:"font-medium w-8 text-center",children:m+1}),e.jsx("button",{onClick:S,className:"p-1 hover:bg-notebook-blue-100 rounded","aria-label":"Move down",children:e.jsx(cs,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx(hs,{name:`questions.${m}.text`,value:u.text,onChange:k=>_(k.target.value),placeholder:"Enter your question here...",rows:2,className:"resize-none"}),e.jsxs("div",{className:"flex items-center gap-3 mt-2",children:[e.jsx(ie,{name:`questions.${m}.type`,value:u.type,onChange:k=>P(u.id,k.target.value),options:[{value:"short",label:"Short Answer"},{value:"medium",label:"Medium Answer"},{value:"detailed",label:"Detailed Answer"},{value:"essay",label:"Essay"}],className:"w-40"}),e.jsx(ie,{value:o,onChange:k=>L(k.target.value),options:[{value:"short",label:"Short"},{value:"medium",label:"Medium"},{value:"detailed",label:"Detailed"}],className:"w-40"}),R&&e.jsx(Hs,{variant:"success",dot:!0,size:"sm",children:"Answer Generated"})]})]}),e.jsx(N,{variant:"ghost",size:"sm",onClick:y,className:"text-red-500 hover:text-red-700",children:e.jsx($e,{className:"w-5 h-5"})})]})})}function oa({question:u,answer:m,answerLength:o,onAnswerLengthChange:R,onEdit:_,onRegenerate:L}){const[P,y]=c.useState(!1),[i,S]=c.useState(m||""),k=()=>{_(i),y(!1)};return e.jsxs("div",{className:"bg-white rounded-xl border border-notebook-blue-100 p-4",children:[e.jsxs("div",{className:"flex items-start justify-between gap-3 mb-3",children:[e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsxs("p",{className:"font-medium text-notebook-ink-50 mb-1",children:["Q: ",u.text]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(ie,{value:o,onChange:d=>R(d.target.value),options:[{value:"short",label:"Short"},{value:"medium",label:"Medium"},{value:"detailed",label:"Detailed"}],className:"w-36"}),e.jsxs(N,{variant:"ghost",size:"sm",onClick:L,children:[e.jsx(ve,{className:"w-4 h-4"})," Regenerate"]})]})]}),e.jsx(N,{variant:"ghost",size:"sm",onClick:()=>y(!P),children:P?e.jsx(Ge,{className:"w-4 h-4"}):e.jsx(ge,{className:"w-4 h-4"})})]}),P?e.jsx(hs,{value:i,onChange:d=>S(d.target.value),rows:4,onBlur:k,onKeyDown:d=>d.key==="Enter"&&(d.metaKey||d.ctrlKey)&&k()}):e.jsx("div",{className:"notebook-page p-4 min-h-[80px] font-notebook text-notebook-ink-50",style:{fontSize:"16px",lineHeight:"28px"},children:m?e.jsx("span",{dangerouslySetInnerHTML:{__html:m.replace(/\n/g,"<br>")}}):e.jsx("span",{className:"text-notebook-blue-300 italic",children:"No answer generated yet"})})]})}const ba=Object.freeze(Object.defineProperty({__proto__:null,CreateAssignmentPage:ia},Symbol.toStringTag,{value:"Module"}));export{ba as C,xa as P};
//# sourceMappingURL=CreateAssignmentPage-0rJucSlL.js.map
