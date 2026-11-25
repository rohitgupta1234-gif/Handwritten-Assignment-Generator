import{r as H,j as o,ar as B,as as G,at as O,D as U,F as Y,aq as V,aD as W,aE as _}from"./vendor-react-DhjAJOz0.js";import{P}from"./CreateAssignmentPage-0rJucSlL.js";import{e as A,s as E}from"./sanitize-Dk79Hu0L.js";import"./vendor-other-D5D0PSxi.js";import"./index-BZre-rX_.js";import"./vendor-utils-CHvWzBCl.js";import"./Input-gAoNRmrC.js";import"./Badge--nOnJLIx.js";import"./Tabs-ClXhprKN.js";import"./Modal-4SkvtqCl.js";import"./RealisticHandwritingSettings-CQtfCnrz.js";function q(e,t,c){const n={cursive:{primary:"Realistic Cursive",fallbacks:["Patrick Hand","Comic Neue","Brush Script MT","Segoe Script","cursive"]},print:{primary:"Realistic Print",fallbacks:["Instrument Serif","Georgia","Times New Roman","serif"]},mixed:{primary:"Realistic Mixed",fallbacks:["Patrick Hand","Comic Neue","Instrument Serif","Georgia","serif"]},calligraphy:{primary:"Realistic Calligraphy",fallbacks:["Brush Script MT","Segoe Script","Edwardian Script ITC","cursive"]}},a={blue:{color:"#1e3a5f",shadow:"rgba(30, 58, 95, 0.3)"},black:{color:"#1a1a2e",shadow:"rgba(26, 26, 46, 0.4)"}},s={ruled:`
      background-image:
        repeating-linear-gradient(
          transparent,
          transparent 28px,
          rgba(239, 68, 68, 0.15) 28px,
          rgba(239, 68, 68, 0.15) 29px
        ),
        linear-gradient(to right, rgba(239, 68, 68, 0.3) 1px, transparent 1px);
      background-position: 0 0, 60px 0;
      background-size: 100% 29px, 1px 100%;
    `,plain:"background-color: white;",grid:`
      background-image:
        linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #fafafa;
    `,custom:"background-color: white;"},r=n[e.style]||n.cursive,i=a[e.penColor]||a.blue,d=s[e.paperStyle]||s.ruled,l=t.handwritingSize==="small"?16:t.handwritingSize==="large"?20:18,p=t.handwritingSize==="small"?28:t.handwritingSize==="large"?36:32,g=l*e.sizeMultiplier,b=p*e.spacingMultiplier*t.lineSpacing,h=.5*e.spacingMultiplier*t.characterSpacing,x=4*e.spacingMultiplier*t.wordSpacing,u=e.thicknessMultiplier*t.penThickness,w=u>1.2?"600":u>.8?"500":u>.5?"400":"300",v=e.style==="cursive"||e.style==="calligraphy"?1-.7*e.sizeMultiplier:1,k=({cursive:-8,print:0,mixed:-4,calligraphy:-12}[e.style]||0)+((c==null?void 0:c.writingAngle)||0)*.3,N=`'${r.primary}', ${r.fallbacks.join(", ")}`,$=e.style==="print"||e.style==="mixed"?"'Instrument Serif', Georgia, 'Times New Roman', serif":N;return`
    @font-face {
      font-family: '${r.primary}';
      src: local('${r.fallbacks[0]}'), local('${r.fallbacks[1]}'), local('${r.fallbacks[2]}');
      font-display: swap;
    }
    .handwriting-text {
      font-family: ${N};
      font-size: ${g}px;
      line-height: ${b}px;
      letter-spacing: ${h*v}px;
      word-spacing: ${x}px;
      font-weight: ${w};
      transform: skewX(${k}deg);
      color: ${i.color};
      text-shadow: 0.5px 0.5px 1px ${i.shadow};
    }
    .question-text {
      font-family: ${$};
      font-size: ${g*1.15}px;
      line-height: ${b*1.3}px;
      font-weight: ${u>1?"600":"500"};
      color: ${i.color};
      transform: skewX(${k*.4}deg);
      text-shadow: 0.5px 0.5px 1px ${i.shadow};
    }
    .paper-${e.paperStyle} {
      ${d}
    }
    .margin-line {
      background-image: linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px);
      background-position: ${t.margins.left}px 0;
      background-size: 1px 100%;
      background-repeat: no-repeat;
    }
    .assignment-title {
      font-family: ${e.style==="print"?"'Instrument Serif', Georgia, serif":"'Realistic Cursive', cursive"};
      font-size: ${24*e.sizeMultiplier}px;
      font-weight: 600;
      color: ${i.color};
      margin-bottom: ${32*e.spacingMultiplier}px;
      text-align: center;
      transform: skewX(${e.style==="cursive"?-4:0}deg);
    }
    .question-block {
      margin-bottom: ${24*e.spacingMultiplier}px;
      page-break-inside: avoid;
    }
    .question-number {
      font-weight: 600;
      margin-right: 8px;
    }
    .answer-text {
      margin-left: ${t.showQuestionNumbers?"2.5rem":"1rem"};
    }
    .page-number {
      position: absolute;
      bottom: 30px;
      right: 30px;
      font-size: 12px;
      color: ${i.color}80;
    }
    .paragraph-left { text-align: left; }
    .paragraph-center { text-align: center; }
    .paragraph-justify { text-align: justify; }
  `}function I(e,t,c,n,a){const s=e.pageSize||"A4",r=P[s],i=n.margins,d=r.height-i.top-i.bottom,p=(n.handwritingSize==="small"?28:n.handwritingSize==="large"?36:32)*a.spacingMultiplier*n.lineSpacing,g=Math.floor(d/p),b=[];let h="",x=0,u=!0;if(u){const w=A(e.title);h+=`<h1 class="assignment-title">${w}</h1>`,x+=2,u=!1}return t.forEach((w,v)=>{const m=c.find(j=>j.questionId===w.id),k=(m==null?void 0:m.editedContent)||(m==null?void 0:m.content)||"",N=(m==null?void 0:m.length)||"medium",$=E(w.text),S=E(k),z=Math.ceil($.length/80)+1,C={short:3,medium:6,detailed:12}[N]*(S.length/200),M=z+C+2;(n.questionStartMode==="new-page"&&!u||n.questionStartMode==="new-line"&&x+z>g||x+M>g)&&h&&(b.push(h),h="",x=0);let y='<div class="question-block">';if(n.showQuestionNumbers?y+=`<p class="question-text"><span class="question-number">Q${v+1}:</span> ${$}</p>`:y+=`<p class="question-text">${$}</p>`,S){const j=a.paragraphAlignment==="center"?"paragraph-center":a.paragraphAlignment==="justify"?"paragraph-justify":"paragraph-left",f=a.lineVariation||a.wordVariation?"natural-variation":"";y+=`<div class="answer-text handwriting-text ${j} ${f}">${S.replace(/\n/g,"<br>")}</div>`}y+="</div>",h+=y,x+=M}),h&&b.push(h),b}function J(e,t,c,n,a,s){const r=e.pageSize||"A4",i=e.paperStyle||"ruled",d=I(e,t,c,a,n),l=d.map((p,g)=>({pageNumber:g+1,content:K(g+1,p,a,n,d.length,a.showPageNumbers,r,i,s),height:P[r].height,width:P[r].width}));return{pages:l,totalPages:l.length}}function K(e,t,c,n,a,s,r,i,d){const l=P[r],p=c.margins,g=q(n,c,d);return`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Realistic Cursive', cursive; background: white; }
        .page-container {
          width: ${l.width}px;
          height: ${l.height}px;
          position: relative;
          padding: ${p.top}px ${p.right}px ${p.bottom}px ${p.left}px;
          background: white;
        }
        ${g}
      </style>
    </head>
    <body>
      <div class="page-container paper-${i} margin-line">
        ${t}
        ${s?`<div class="page-number">Page ${e} of ${a}</div>`:""}
      </div>
    </body>
    </html>
  `}function ee(e,t,c,n,a,s){const r=I(e,t,c,a,n),i=e.pageSize||"A4",d=P[i],l=a.margins,p=e.paperStyle||"ruled",g=q(n,a,s);let b=`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Realistic Cursive', cursive; background: #f5f5f5; padding: 20px; }
        .page-container {
          width: ${d.width}px;
          height: ${d.height}px;
          position: relative;
          padding: ${l.top}px ${l.right}px ${l.bottom}px ${l.left}px;
          background: white;
          margin: 0 auto 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .paper-${p} { background-color: white; }
        ${g}
      </style>
    </head>
    <body>
  `;return r.forEach((h,x)=>{const u=A(e.title);b+=`
      <div class="page-container paper-${p} margin-line">
        ${x===0?`<h1 class="assignment-title">${u}</h1>`:""}
        ${h}
        ${a.showPageNumbers?`<div class="page-number">Page ${x+1} of ${r.length}</div>`:""}
      </div>
    `}),b+="</body></html>",b}function Q(e,t){const c=t.handwritingSize==="small"?16:t.handwritingSize==="large"?20:18,n=t.handwritingSize==="small"?28:t.handwritingSize==="large"?36:32,a=c*(e.letterHeight/100),s=n*t.lineSpacing*(e.lineSpacing/100),r=.5*t.characterSpacing*(e.characterSpacing/100),i=4*t.wordSpacing*(e.wordSpacing/100),d=e.penThickness>1.2?"600":e.penThickness>.8?"500":"400",l=e.writingAngle||0,p="'Patrick Hand', 'Comic Neue', 'Brush Script MT', 'Segoe Script', cursive";return`
    .handwriting-text {
      font-family: ${p};
      font-size: ${a}px;
      line-height: ${s}px;
      letter-spacing: ${r}px;
      word-spacing: ${i}px;
      font-weight: ${d};
      transform: skewX(${l}deg);
      color: #1a1a2e;
      text-shadow: 0.5px 0.5px 1px rgba(26, 26, 46, 0.3);
    }
    .question-text {
      font-family: ${p};
      font-size: ${a*1.15}px;
      line-height: ${s*1.3}px;
      font-weight: ${d==="600"?"700":"600"};
      color: #1a1a2e;
      transform: skewX(${l*.4}deg);
      text-shadow: 0.5px 0.5px 1px rgba(26, 26, 46, 0.3);
    }
    .assignment-title {
      font-family: ${p};
      font-size: ${24*(e.letterHeight/100)}px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: ${32*t.lineSpacing}px;
      text-align: center;
      transform: skewX(${l*.5}deg);
    }
    .question-block {
      margin-bottom: ${24*t.lineSpacing}px;
      page-break-inside: avoid;
    }
    .question-number {
      font-weight: 600;
      margin-right: 8px;
    }
    .answer-text {
      margin-left: ${t.showQuestionNumbers?"2.5rem":"1rem"};
    }
    .page-number {
      position: absolute;
      bottom: 30px;
      right: 30px;
      font-size: 12px;
      color: rgba(26, 26, 46, 0.5);
    }
    .margin-line {
      background-image: linear-gradient(to right, rgba(239, 68, 68, 0.4) 1px, transparent 1px);
      background-position: ${t.margins.left}px 0;
      background-size: 1px 100%;
      background-repeat: no-repeat;
    }
    .paper-ruled {
      background-image:
        repeating-linear-gradient(
          transparent,
          transparent 28px,
          rgba(239, 68, 68, 0.15) 28px,
          rgba(239, 68, 68, 0.15) 29px
        ),
        linear-gradient(to right, rgba(239, 68, 68, 0.3) 1px, transparent 1px);
      background-position: 0 0, 60px 0;
      background-size: 100% 29px, 1px 100%;
    }
    .paper-plain {
      background-color: white;
    }
    .paper-grid {
      background-image:
        linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px);
      background-size: 20px 20px;
      background-color: #fafafa;
    }
  `}function X(e,t,c,n,a){const s=e.pageSize||"A4",r=P[s],i=n.margins,d=r.height-i.top-i.bottom,p=(n.handwritingSize==="small"?28:n.handwritingSize==="large"?36:32)*n.lineSpacing*(a.lineSpacing/100),g=Math.floor(d/p),b=[];let h="",x=0,u=!0;if(u){const w=A(e.title);h+=`<h1 class="assignment-title">${w}</h1>`,x+=2,u=!1}return t.forEach((w,v)=>{const m=c.find(j=>j.questionId===w.id),k=(m==null?void 0:m.editedContent)||(m==null?void 0:m.content)||"",N=(m==null?void 0:m.length)||"medium",$=E(w.text),S=E(k),z=Math.ceil($.length/80)+1,C={short:3,medium:6,detailed:12}[N]*(S.length/200),M=z+C+2;(n.questionStartMode==="new-page"&&!u||n.questionStartMode==="new-line"&&x+z>g||x+M>g)&&h&&(b.push(h),h="",x=0);let y='<div class="question-block">';n.showQuestionNumbers?y+=`<p class="question-text"><span class="question-number">Q${v+1}:</span> ${$}</p>`:y+=`<p class="question-text">${$}</p>`,S&&(y+=`<div class="answer-text handwriting-text">${S.replace(/\n/g,"<br>")}</div>`),y+="</div>",h+=y,x+=M}),h&&b.push(h),b}function te(e,t,c,n,a){const s=e.pageSize||"A4",r=e.paperStyle||"ruled",i=n.characteristics,d=X(e,t,c,a,i),l=d.map((p,g)=>({pageNumber:g+1,content:ae(g+1,p,a,i,d.length,a.showPageNumbers,s,r),height:P[s].height,width:P[s].width}));return{pages:l,totalPages:l.length}}function ae(e,t,c,n,a,s,r,i){const d=P[r],l=c.margins,p=Q(n,c);return`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Patrick Hand', cursive; background: white; }
        .page-container {
          width: ${d.width}px;
          height: ${d.height}px;
          position: relative;
          padding: ${l.top}px ${l.right}px ${l.bottom}px ${l.left}px;
          background: white;
        }
        ${p}
      </style>
    </head>
    <body>
      <div class="page-container paper-${i} margin-line">
        ${t}
        ${s?`<div class="page-number">Page ${e} of ${a}</div>`:""}
      </div>
    </body>
    </html>
  `}function ne(e,t,c,n,a){const s=n.characteristics,r=X(e,t,c,a,s),i=e.pageSize||"A4",d=P[i],l=a.margins,p=e.paperStyle||"ruled",g=Q(s,a);let b=`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Patrick Hand', cursive; background: #f5f5f5; padding: 20px; }
        .page-container {
          width: ${d.width}px;
          height: ${d.height}px;
          position: relative;
          padding: ${l.top}px ${l.right}px ${l.bottom}px ${l.left}px;
          background: white;
          margin: 0 auto 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .paper-${p} { background-color: white; }
        ${g}
      </style>
    </head>
    <body>
  `;return r.forEach((h,x)=>{const u=A(e.title);b+=`
      <div class="page-container paper-${p} margin-line">
        ${x===0?`<h1 class="assignment-title">${u}</h1>`:""}
        ${h}
        ${a.showPageNumbers?`<div class="page-number">Page ${x+1} of ${r.length}</div>`:""}
      </div>
    `}),b+="</body></html>",b}function me({assignment:e,questions:t,answers:c,settings:n,mode:a,realisticOptions:s,profileCharacteristics:r,generatedPages:i=[],title:d,paperStyle:l="ruled",pageSize:p="A4",className:g="",onDownloadPDF:b,onDownloadDOCX:h,onPrint:x}){const[u,w]=H.useState(1),[v,m]=H.useState(!1),[k,N]=H.useState(0),$=d||(e==null?void 0:e.title)||"Assignment Preview",S=l||(e==null?void 0:e.paperStyle)||"ruled",z=p||(e==null?void 0:e.pageSize)||"A4",T=H.useMemo(()=>{if(i&&i.length>0){const L={width:794,height:1123},F=n.margins;let D=`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Realistic Cursive', cursive; background: #f5f5f5; padding: 20px; }
            .page-container {
              width: ${L.width}px;
              height: ${L.height}px;
              position: relative;
              padding: ${F.top}px ${F.right}px ${F.bottom}px ${F.left}px;
              background: white;
              margin: 0 auto 20px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .paper-${S} { background-color: white; }
          </style>
        </head>
        <body>
      `;return i.forEach(Z=>{D+=`
          <div class="page-container paper-${S}">
            ${Z.htmlContent}
          </div>
        `}),D+="</body></html>",D}if(!e&&t.length===0||!e&&!i)return null;const f=e||{title:$,paperStyle:S,pageSize:z};return a==="realistic"&&s?ee(f,t,c,s,n,r||void 0):a==="personal"&&r?ne(f,t,c,{characteristics:r},n):null},[e,t,c,n,a,s,r,i,$,S,z]),C=H.useMemo(()=>{if(i&&i.length>0)return i.length;if(!e&&t.length===0||!e&&!i)return 0;const f=e||{title:$,paperStyle:S,pageSize:z};return a==="realistic"&&s?J(f,t,c,s,n,r||void 0).totalPages:a==="personal"&&r?te(f,t,c,{characteristics:r},n).totalPages:0},[e,t,c,n,a,s,r,i,$,S,z]),M=()=>w(f=>Math.min(2,f+.1)),R=()=>w(f=>Math.max(.3,f-.1)),y=()=>w(1),j=()=>{m(f=>!f),v?document.body.style.overflow="":document.body.style.overflow="hidden"};return H.useEffect(()=>()=>{document.body.style.overflow=""},[]),!e||t.length===0?o.jsx("div",{className:`handwriting-preview ${g} empty`,children:o.jsxs("div",{className:"preview-placeholder",children:[o.jsx("div",{className:"placeholder-icon",children:"📝"}),o.jsx("h3",{children:"No Preview Available"}),o.jsx("p",{children:"Add questions and generate answers to see a live preview of your handwritten assignment."})]})}):o.jsxs("div",{className:`handwriting-preview ${g} ${v?"fullscreen":""}`,children:[o.jsxs("div",{className:"preview-toolbar",children:[o.jsxs("div",{className:"toolbar-left",children:[o.jsx("h3",{className:"preview-title",children:$}),o.jsx("span",{className:"preview-mode",children:a==="personal"?"👤 Personal":"✨ Realistic"}),C>1&&o.jsxs("div",{className:"page-nav",children:[o.jsx("button",{className:"nav-btn",onClick:()=>N(f=>Math.max(0,f-1)),disabled:k===0,children:"← Prev"}),o.jsxs("span",{className:"page-indicator",children:["Page ",k+1," of ",C]}),o.jsx("button",{className:"nav-btn",onClick:()=>N(f=>Math.min(C-1,f+1)),disabled:k>=C-1,children:"Next →"})]})]}),o.jsxs("div",{className:"toolbar-right",children:[o.jsxs("div",{className:"zoom-control",children:[o.jsx("button",{className:"tool-btn",onClick:R,title:"Zoom out",disabled:u<=.3,children:o.jsx(B,{size:16})}),o.jsxs("span",{className:"zoom-level",children:[Math.round(u*100),"%"]}),o.jsx("button",{className:"tool-btn",onClick:M,title:"Zoom in",disabled:u>=2,children:o.jsx(G,{size:16})}),o.jsx("button",{className:"tool-btn",onClick:y,title:"Reset zoom",children:o.jsx(O,{size:16})})]}),o.jsx("button",{className:"tool-btn",onClick:b,title:"Download PDF",children:o.jsx(U,{size:16})}),o.jsx("button",{className:"tool-btn",onClick:h,title:"Download DOCX",children:o.jsx(Y,{size:16})}),o.jsx("button",{className:"tool-btn",onClick:x,title:"Print",children:o.jsx(V,{size:16})}),o.jsx("button",{className:"tool-btn",onClick:j,title:v?"Exit fullscreen":"Fullscreen",children:v?o.jsx(W,{size:16}):o.jsx(_,{size:16})})]})]}),o.jsx("div",{className:"preview-container",style:{transform:`scale(${u})`,transformOrigin:"top center",width:`${100/u}%`},children:T&&o.jsx("iframe",{className:"preview-iframe",srcDoc:T,sandbox:"allow-same-origin",title:"Handwriting Preview"})}),v&&o.jsx("button",{className:"fullscreen-exit-hint",onClick:j,children:"Press ESC or click to exit fullscreen"})]})}export{me as HandwritingPreview};
//# sourceMappingURL=HandwritingPreview-BXzm74kN.js.map
