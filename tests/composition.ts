import { dirname, fromFileUrl, join } from "stdlib/path";
import { copy } from "stdlib/fs";

const repo=dirname(dirname(fromFileUrl(import.meta.url)));
const root=await Deno.makeTempDir({prefix:"qrc-profiles-"});
const quarto=Deno.env.get("QUARTO")||"quarto";
function assert(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
async function write(path:string,text:string){await Deno.mkdir(dirname(join(root,path)),{recursive:true});await Deno.writeTextFile(join(root,path),text);}
async function render(profile:string,success=true){const result=await new Deno.Command(quarto,{args:["render","--profile",profile],cwd:root,stdout:"piped",stderr:"piped"}).output();assert(result.success===success,new TextDecoder().decode(result.stdout)+new TextDecoder().decode(result.stderr));}
try {
 await copy(join(repo,"_extensions"),join(root,"_extensions"));
 await copy(join(Deno.env.get("COURSE_SITE_REPO") ?? join(repo,"../quarto-project-publish"),"_extensions/course-site"),join(root,"_extensions/course-site"));
 await write("_quarto.yml",'project:\n  type: website\n  output-dir: _site\n  render: [index.qmd]\n  pre-render: _extensions/course-site/entrypoints/pre.ts\n  post-render: _extensions/course-site/entrypoints/post.ts\nformat: html\nfilters: [reference-catalog]\nreference-catalog:\n  namespace: site\nsubprojects: [book, lectures, practice]\n');
 await write("index.qmd",'# Landing\n\n@book:sec-main\n');
 for(const profile of ["student","full"])await write(`_quarto-${profile}.yml`,`project:\n  output-dir: _site-${profile}\n`);
 for(const member of ["book","lectures","practice"]){
  await copy(join(repo,"_extensions"),join(root,member,"_extensions"));
  await write(`${member}/_quarto.yml`,`project:\n  type: website\n  output-dir: _site\n  render: [index.qmd]\n  post-render:\n    - _extensions/reference-catalog/entrypoints/post.ts\n    - ../_extensions/course-site/entrypoints/collect.ts\nformat: html\nfilters: [reference-catalog]\nreference-catalog:\n  namespace: ${member}\n`);
  for(const profile of ["student","full"])await write(`${member}/_quarto-${profile}.yml`,`title: ${member}-${profile}\nproject:\n  output-dir: _site-${profile}\n`);
  const next=member==="book"?"lectures":member==="lectures"?"practice":"book";
  await write(`${member}/index.qmd`,`# ${member} {#sec-main}\n\n@${next}:sec-main\n\n::: {.content-visible when-profile="full"}\nPRIVATE_${member}\n:::\n`);
 }
 await render("full");await render("student");
 for(const member of ["book","lectures","practice"]){
  const path=`${member}/index.html`;
  const student=await Deno.readTextFile(join(root,"_site-student",path));
  const full=await Deno.readTextFile(join(root,"_site-full",path));
  assert(student.includes(`${member}-student`)&&!student.includes(`PRIVATE_${member}`),`Student profile failed in ${member}`);
  assert(full.includes(`${member}-full`)&&full.includes(`PRIVATE_${member}`),`Full profile failed in ${member}`);
 }

 await Deno.remove(join(root,"practice/_quarto-student.yml"));await render("student");
 const fallback=await Deno.readTextFile(join(root,"_site-student/practice/index.html"));
 assert(!fallback.includes("PRIVATE_practice"),"Native missing-profile fallback leaked full content");
 console.log("PASS composite profiles: three members, circular links, full/student separation, profile-output exclusion, native missing-child-profile fallback remains public");
} finally {await Deno.remove(root,{recursive:true});}
