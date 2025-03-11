export default function Session() {

    const GenerateCookieStr = domain => {
        return this.cookies.filter(e => {
            const regexp = e.domain.startsWith(".") ? new RegExp(`\.${e.domain}$`) : new RegExp(`^${e.domain}$`)
            return Boolean(domain.match(regexp))
        }).map(e => `${e.name}=${e.value}`).join("; ")
    }

    const _cookies = []
    this.cookies = new Proxy(_cookies,{
        get : function(target,prop){
            if(prop == Symbol.toStringTag || isNaN(prop)){
                // length とか filterの可能性がある
                return target[prop]
            }
            if(new Date(target[prop].expires).getTime() <= Date.now()){
                console.debug("期限切れのクッキーが見つかりました。削除します")
                delete target[prop]
            } 
            return target[prop]
        },
        set : function(target,prop,value){
            if(isNaN(prop)){
                // length とか filterの可能性がある
                return true
            }
            if((new Date(value.expires).getTime() <= Date.now())){
                console.debug("保存しようとしたクッキーは期限切れです")
            }else{
                target[prop] = value
            }
            return true
        }
    })
    
    this.fetch = async function (...args) {
        const request = this.createRequest(args)

        const res = await fetch(request)

        // クッキー保存
        const cookies = res.headers.getSetCookie()
        this.ImportFromSetCookieStrings(cookies,new URL(res.url).hostname)
        return res
    }

    this.createRequest = function(...args){
        // requestオブジェクト作成
        let request;
        if(args[0] instanceof Request){
            request = args[0]
        }else{
            request = new Request(...args)
        }

        // Cookieを設定、ユーザーがheaders -> cookieを設定済みなら、末尾に加える
        const domain = new URL(request.url).hostname
        const cookie_append = GenerateCookieStr(domain)
        let already = request.headers.get("cookie")
        if(already != null && already != ""){
            already += "; "
        }else{
            already = ""
        }
        request.headers.set("cookie",already + cookie_append)

        return request
    }

    this.ImportFromHeaderString = function(str,options){
        // for(const [k,v] of str.split(/; */).map(e => e.split("="))){
        for(const [k,v] of str.split(/; */).map(e => e.split(/(?<=^[^=]*?)=/))){
            const dict = {}
            dict.name = k;
            dict.value = v;
            dict.domain = options.domain;
            dict.expires = options?.expires
            this.cookies = this.cookies.filter(e => e.name != dict.name)
            this.cookies.push(dict)
        }
    }

    this.ImportFromSetCookieStrings = function(strs,options){
        for(const str of strs){
            const kvs = str.split("; ").map(e => e.split(/(?<=^[^=]*?)=/))
            const dict = {}
            dict.name = kvs[0][0]
            dict.value = kvs[0][1]
            for (const [k, v] of kvs.slice(1)) {
                dict[k.toLowerCase()] = v
            }
            if(dict.domain == undefined){
                if(options?.domain) throw new Error("there is cookie which does not have attribute \"domain\". give options?.hostname to use its domain.")
                dict.domain == options?.domain
            }
            this.cookies = this.cookies.filter(e => e.name != dict.name)
            this.cookies.push(dict)
        }
    }

    this.ParseHeaderStrings = function(strs,domain){
        const cookies = []
        for (const cookie of strs) {
            const kvs = cookie.split("; ").map(e => e.split("="))
            const dict = {}
            dict.name = kvs[0][0]
            dict.value = kvs[0][1]
            for (const [k, v] of kvs.slice(1)) {
                dict[k.toLowerCase()] = v
            }
            if(dict.domain == undefined){
                dict.domain == domain
            }
            cookies.push(dict)
        }
        return cookies
    }

    this.ExportAsHeaderString = function(){
        return this.cookies.map(e => `${e.name}=${e.value}`).join("; ")
    }
}