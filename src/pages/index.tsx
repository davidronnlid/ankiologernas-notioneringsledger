import Layout from "@/components/Layout";
import LectureTitle from "@/components/LectureTitle";
import lectureDetails from "../data/lectureData";

export default function Home() {
  return (
    <Layout>
      <>
        {lectureDetails.map((item, index) => (
          <LectureTitle key={index} week={item.week} lectures={item.lectures} />
        ))}
      </>
    </Layout>
  );
}
