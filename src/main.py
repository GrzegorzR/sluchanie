from collections import defaultdict
import random

from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import pandas as pd
from numpy import ndarray

from config import SCOPES, SHEET_ID, DEBUG, APPLICATION_CREDS

creds = Credentials.from_service_account_file(APPLICATION_CREDS, scopes=SCOPES)
service = build("sheets", "v4", credentials=creds)


def get_rows(max_col="Z", test_sheet=False)->list[list[str]]:
    if test_sheet:
        range_str = f"test!A:{max_col}"
    else:
        range_str = f"A:{max_col}"
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SHEET_ID, range=range_str)
        .execute()
    )

    rows = result.get("values", [])
    return rows


def choose_record(meeting_df: pd.DataFrame) -> tuple[str, str]:
    present = meeting_df.loc[:, meeting_df.iloc[-1] == "TRUE"]
    present = present.fillna("")
    records = present.loc[1:5]
    empty_ind = [col for col in records if records[col].sum() == ""]
    present_and_has_list = present.drop(empty_ind, axis=1)
    weights = list(present_and_has_list.iloc[-2].astype(float))
    chosen_one = random.choices(present_and_has_list.columns, weights=weights)[0]

    chosen_one_name = present_and_has_list.loc[0, chosen_one]
    chosen_list = [s for s in present_and_has_list.loc[1:5, chosen_one].tolist() if s]

    chosen_record_ind = random.randint(0, len(chosen_list) - 1)
    print(chosen_list, chosen_record_ind)
    chosen_record_name = chosen_list[chosen_record_ind]

    return chosen_one_name, chosen_record_name


def calculate_new_weights(meeting_df: pd.DataFrame,  person_ind: int) -> ndarray[int]:
    points_arr = meeting_df.to_numpy()[-2,1:].astype(int)
    present_arr = meeting_df.to_numpy()[-1,1:]
    present_num = len([p for p in present_arr if p == "TRUE"])
    chosen_points = points_arr[person_ind]
    if chosen_points/present_num > 5:
        points_to_add = 5
    else:
        points_to_add = chosen_points//present_num
    for i in range(len(points_arr)):
        if present_arr[i] == "TRUE" and i != person_ind:
            points_arr[i] += points_to_add
    points_arr[person_ind] -= points_to_add * (present_num - 1)

    return points_arr

def test_distribution(tries=1000):
    rows = get_rows()
    meeting_df = pd.DataFrame(rows[-8:])
    counter = defaultdict(lambda : 0)
    for i in range(tries):
        person, record_ind = choose_record(meeting_df)

        counter[person] += 1
        print(person, record_ind)
    for person, count in counter.items():
        print(person, f"{100*count/tries}%")


def main():
    rows = get_rows()
    meeting_df = pd.DataFrame(rows[-8:])
    name_col_id_dict = {n: i for i, n in enumerate(rows[-8])}

    person, record_name = choose_record(meeting_df)
    new_weights = calculate_new_weights(meeting_df, name_col_id_dict[person]-1)
    print("The chosen one is: ", person)
    print("The record is: ", record_name)
    print("New weights are: ")
    print(*new_weights, sep="\t")


if __name__ == '__main__':
    if DEBUG:
        print("1000 tries distribution:")
        test_distribution()
        print("\n\n")

    main()



