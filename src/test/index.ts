import Router from "../Router";
import sub1Router from "./sub1";


const router = new Router();
router.use("/sub1", sub1Router);


router.getMatchingRoutesByPath("/sub1/sub2/sub3/hello/");
