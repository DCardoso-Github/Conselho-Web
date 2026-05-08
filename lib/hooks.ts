"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { classSortKey } from "./mapao/className";

export function useClasses() {
    return (
        useLiveQuery(async () => {
            const all = await db.classes.toArray();
            all.sort((a, b) => {
                const [an, al] = classSortKey(a.id);
                const [bn, bl] = classSortKey(b.id);
                if (an !== bn) return an - bn;
                return al.localeCompare(bl);
            });
            return all;
        }, []) ?? []
    );
}

export function useClass(classId: string | undefined) {
    return useLiveQuery(async () => {
        if (!classId) return undefined;
        return db.classes.get(classId);
    }, [classId]);
}

export function useStudents(classId: string | undefined) {
    return (
        useLiveQuery(async () => {
            if (!classId) return [];
            return db.students.where("classId").equals(classId).sortBy("order");
        }, [classId]) ?? []
    );
}

export function useStudent(studentId: number | undefined) {
    return useLiveQuery(async () => {
        if (studentId === undefined) return undefined;
        return db.students.get(studentId);
    }, [studentId]);
}
