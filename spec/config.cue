package catalog

import "list"

#Namespace: string & =~"^[A-Za-z][A-Za-z0-9_-]*$"
#Import: {
  source: string & !=""
  namespace: #Namespace
  "base-url": string & =~"^https?://.*/$"
  title?: string & !=""
  style?: "default" | "number" | "title" | "external"
}
// Локальные пространства имён доступны только после чтения публикации;
// их пересечения с импортом и принадлежность экспорта проверяет runtime.
#Catalog: {
  namespace?: #Namespace
  imports?: {[#Namespace]: #Import}
  exports?: {[#Namespace]: "*" | ([...string & =~"^[^\\s:#]+$"] & list.UniqueItems)}
  publication?: {title: string & !=""}
}
