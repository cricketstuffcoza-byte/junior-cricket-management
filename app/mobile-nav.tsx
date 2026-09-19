type MobileNavProps = {
  isSystemAdmin?: boolean;
  isSchoolAdmin?: boolean;
  isCoach?: boolean;
  isParent?: boolean;
  isScorer?: boolean;
  schoolAdminLink?: string | null;
  active?: string;
};

export function MobileNav({
  isSystemAdmin=false,
  isSchoolAdmin=false,
  isCoach=false,
  isParent=false,
  isScorer=false,
  schoolAdminLink=null,
  active='dashboard',
}: MobileNavProps) {
  const links:{href:string;label:string;key:string}[]=[
    {href:'/dashboard',label:'Dashboard',key:'dashboard'},
    ...(isCoach?[{href:'/coach',label:'Coach Portal',key:'coach'}]:[]),
    ...(isParent?[{href:'/parent/availability',label:'Parent Portal',key:'parent'}]:[]),
    ...(isSchoolAdmin&&schoolAdminLink?[{href:`/school?school=${schoolAdminLink}`,label:'School Admin Portal',key:'school'}]:[]),
    ...(isSystemAdmin?[{href:'/admin',label:'System Admin',key:'admin'},{href:'/admin/users',label:'Users & Roles',key:'users'}]:[]),
    ...(isScorer?[{href:'/scorer',label:'Scorer Portal',key:'scorer'}]:[]),
    ...((isSystemAdmin||isSchoolAdmin||isCoach||isScorer)?[{href:'/operations',label:'Competitions & Fixtures',key:'operations'}]:[]),
    ...((isSystemAdmin||isSchoolAdmin||isCoach||isScorer)?[{href:'/operations#matches',label:'Matches / Live Scoring',key:'matches'}]:[]),
  ];

  return <details className="mobile-nav">
    <summary><span className="mobile-nav-icon">☰</span><span>Menu</span></summary>
    <nav className="mobile-nav-panel" aria-label="JCM mobile navigation">
      {links.map(link=><a key={link.key} className={active===link.key?'active':''} href={link.href}>{link.label}</a>)}
    </nav>
  </details>;
}
